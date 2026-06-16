import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';

import { Subscription } from 'rxjs';
import { ContactoService } from '../../services/contacto.service';
import { Contacto } from '../../models/Contacto';
import { supabase } from '../supabase.client';

@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './lista.html',
  styleUrl: './lista.css',
})
export class Lista implements OnInit, OnDestroy {

  contactos: Contacto[] = [];
  contactosFiltrados: Contacto[] = [];

  formulario!: FormGroup;

  loading = false;
  error: string | null = null;

  validationErrors: { [key: string]: string[] } = {};
  serverErrors: string[] = [];

  contactoEditando: Contacto | null = null;
  esModoEdicion = false;

  // Variables para paginación
  paginaActual: number = 1;
  elementosPorPagina: number = 8;
  totalPaginas: number = 0;

  // Variable para búsqueda
  terminoBusqueda: string = '';

  private subscriptions = new Subscription();

  constructor(
    private contactoService: ContactoService,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    // 1. Inicializar arrays explícitamente (evita undefined en filtrarContactos)
    this.contactos = [];
    this.contactosFiltrados = [];

    // 2. Construir formulario
    this.formulario = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],
      celular: [''],
      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],
      ubicacion: [
        '',
        Validators.required
      ],
      estado: ['activo']
    });

    // 3. Cargar lista PRIMERO — esto pinta la tabla de inmediato
    this.cargar();

    // 4. Pedir geolocalización en paralelo (no bloquea la carga)
    this.obtenerUbicacion();

    // 5. Suscribirse a cambios en tiempo real DESPUÉS de la carga inicial
    this.escucharCambiosTiempoReal();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get f() {
    return this.formulario.controls;
  }

  obtenerUbicacion() {
    if (!navigator.geolocation) {
      this.error = 'El navegador no soporta geolocalización';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.formulario.patchValue({
          ubicacion: `${lat}, ${lng}`
        });
      },
      (err) => {
        console.error(err);
        this.error = 'No fue posible obtener la ubicación actual';
      }
    );
  }

 cargar() {
  this.loadingLista = true;  // ← este, no loading
  this.error = null;

  const sub = this.contactoService.listar().subscribe({
    next: (data) => {
      this.contactos = data ?? [];
      this.filtrarContactos();
      this.loadingLista = false;  // ← este
      this.escucharCambiosTiempoReal();
    },
    error: (err) => {
      this.error = 'No se pudieron cargar los contactos';
      this.contactos = [];
      this.contactosFiltrados = [];
      this.calcularTotalPaginas();
      this.loadingLista = false;  // ← este
      this.escucharCambiosTiempoReal();
    }
  });

  this.subscriptions.add(sub);
}

  escucharCambiosTiempoReal() {
    const channel = supabase
      .channel('cambios-contactos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contactos' },
        (payload) => {
          console.log('Cambio detectado en tiempo real:', payload);

          switch (payload.eventType) {
            case 'INSERT':
              this.contactos = [payload.new as Contacto, ...this.contactos];
              break;

            case 'UPDATE':
              this.contactos = this.contactos.map(contacto =>
                contacto.id === payload.new.id ? (payload.new as Contacto) : contacto
              );
              break;

            case 'DELETE':
              this.contactos = this.contactos.filter(contacto =>
                contacto.id !== payload.old.id
              );
              break;
          }

          this.filtrarContactos();
        }
      )
      .subscribe();

    this.subscriptions.add(new Subscription(() => {
      supabase.removeChannel(channel);
    }));
  }

  filtrarContactos() {
    // Guarda contra arrays no inicializados
    if (!this.contactos) {
      this.contactosFiltrados = [];
      this.calcularTotalPaginas();
      return;
    }

    if (!this.terminoBusqueda.trim()) {
      this.contactosFiltrados = [...this.contactos];
    } else {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      this.contactosFiltrados = this.contactos.filter(contacto =>
        (contacto.nombre?.toLowerCase().includes(termino) || false) ||
        (contacto.email?.toLowerCase().includes(termino) || false) ||
        (contacto.celular?.includes(termino) || false)
      );
    }

    this.paginaActual = 1;
    this.calcularTotalPaginas();
  }

  buscarContactos(event: Event) {
    this.terminoBusqueda = (event.target as HTMLInputElement).value;
    this.filtrarContactos();
  }

  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.filtrarContactos();
  }

  calcularTotalPaginas() {
    this.totalPaginas = Math.ceil(this.contactosFiltrados.length / this.elementosPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;
  }

  get contactosPaginaActual(): Contacto[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.contactosFiltrados.slice(inicio, fin);
  }

  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  get paginas(): number[] {
    const paginas: number[] = [];
    const maxPaginasMostradas = 5;

    let inicio = Math.max(1, this.paginaActual - Math.floor(maxPaginasMostradas / 2));
    let fin = Math.min(this.totalPaginas, inicio + maxPaginasMostradas - 1);

    if (fin - inicio + 1 < maxPaginasMostradas) {
      inicio = Math.max(1, fin - maxPaginasMostradas + 1);
    }

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  }

  getInicioPaginacion(): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + 1;
  }

  getFinPaginacion(): number {
    return Math.min(
      this.paginaActual * this.elementosPorPagina,
      this.contactosFiltrados.length
    );
  }

  cambiarElementosPorPagina(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.elementosPorPagina = parseInt(select.value, 10);
    this.calcularTotalPaginas();
    this.cambiarPagina(1);
  }

  guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.validationErrors = {};
    this.serverErrors = [];

    const contacto: Contacto = this.formulario.value;
    let request;

    if (this.esModoEdicion && this.contactoEditando) {
      request = this.contactoService.actualizar(this.contactoEditando.id!, contacto);
    } else {
      request = this.contactoService.crear(contacto);
    }

    const sub = request.subscribe({
      next: () => {
        this.formulario.reset({ estado: 'activo' });
        this.obtenerUbicacion();
        this.cerrarModal();
        this.resetModoEdicion();
        this.loading = false;
        // Realtime se encarga de reflejar el cambio en la lista automáticamente
      },
      error: (err) => {
        console.error(err);
        this.loading = false;

        if (err.error?.message) {
          if (Array.isArray(err.error.message)) {
            err.error.message.forEach((msg: string) => {
              this.processErrorMessage(msg);
            });
          } else {
            this.error = err.error.message;
          }
        }
      }
    });

    this.subscriptions.add(sub);
  }

  editar(contacto: Contacto) {
    this.esModoEdicion = true;
    this.contactoEditando = contacto;

    this.formulario.patchValue({
      nombre: contacto.nombre,
      celular: contacto.celular,
      email: contacto.email,
      ubicacion: contacto.ubicacion,
      estado: contacto.estado || 'activo'
    });

    this.abrirModal();
  }

  resetModoEdicion() {
    this.esModoEdicion = false;
    this.contactoEditando = null;
  }

  processErrorMessage(msg: string) {
    const fieldMatch = msg.match(/^(\w+)\s+/);

    if (fieldMatch) {
      const field = fieldMatch[1];
      if (!this.validationErrors[field]) {
        this.validationErrors[field] = [];
      }
      this.validationErrors[field].push(msg);
    } else {
      this.serverErrors.push(msg);
    }
  }

  eliminar(id: number) {
    if (!confirm('¿Eliminar contacto?')) {
      return;
    }

    const sub = this.contactoService
      .eliminar(id)
      .subscribe({
        next: () => {
          // Realtime elimina el elemento de la lista automáticamente
        },
        error: (err) => {
          console.error(err);
          this.error = 'Error al eliminar';
        }
      });

    this.subscriptions.add(sub);
  }

  abrirModal() {
    this.validationErrors = {};
    this.serverErrors = [];

    if (!this.esModoEdicion) {
      this.formulario.reset({ estado: 'activo' });
      this.obtenerUbicacion();
    }

    const modal = document.getElementById('modal_contacto') as HTMLDialogElement;
    modal?.showModal();
  }

  cerrarModal() {
    const modal = document.getElementById('modal_contacto') as HTMLDialogElement;
    modal?.close();
    this.resetModoEdicion();
  }

  getFieldError(field: string): string | null {
    if (this.validationErrors[field]) {
      return this.validationErrors[field][0];
    }
    return null;
  }

  hasError(field: string): boolean {
    return !!this.validationErrors[field];
  }

  getTituloModal(): string {
    return this.esModoEdicion ? 'Editar Contacto' : 'Nuevo Contacto';
  }

  getTextoBoton(): string {
    return this.esModoEdicion ? 'Actualizar' : 'Guardar';
  }
}
