import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { FormsModule } from '@angular/forms'; // IMPORTANTE: Agregar FormsModule

import { Subscription } from 'rxjs';
import { ContactoService } from '../../services/contacto.service';
import { Contacto } from '../../models/Contacto';

@Component({
  selector: 'app-lista',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule  // IMPORTANTE: Agregar FormsModule aquí
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

    this.formulario = this.fb.group({
      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      celular: [
        ''
      ],

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

      estado: [
        'activo'
      ]
    });

    this.obtenerUbicacion();

    this.cargar();
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

        this.error =
          'No fue posible obtener la ubicación actual';
      }
    );
  }

  cargar() {

    this.loading = true;

    const sub = this.contactoService
      .listar()
      .subscribe({
        next: (data) => {

          this.contactos = data;
          this.filtrarContactos();
          this.loading = false;

        },
        error: (err) => {

          console.error(err);

          this.error =
            'No se pudieron cargar los contactos';

          this.loading = false;
        }
      });

    this.subscriptions.add(sub);
  }

  // Método para filtrar contactos por búsqueda
  filtrarContactos() {
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
    
    // Resetear a la primera página cuando se filtra
    this.paginaActual = 1;
    this.calcularTotalPaginas();
  }

  // Método para actualizar el término de búsqueda
  buscarContactos(event: Event) {
    this.terminoBusqueda = (event.target as HTMLInputElement).value;
    this.filtrarContactos();
  }

  // Método para limpiar la búsqueda
  limpiarBusqueda() {
    this.terminoBusqueda = '';
    this.filtrarContactos();
  }

  // Calcular total de páginas
  calcularTotalPaginas() {
    this.totalPaginas = Math.ceil(this.contactosFiltrados.length / this.elementosPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;
  }

  // Obtener contactos de la página actual
  get contactosPaginaActual(): Contacto[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.contactosFiltrados.slice(inicio, fin);
  }

  // Cambiar de página
  cambiarPagina(pagina: number) {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  // Página anterior
  paginaAnterior() {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  // Página siguiente
  paginaSiguiente() {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  // Obtener array de páginas para mostrar
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

  // Método para calcular el inicio de la paginación (reemplaza Math.min en el template)
  getInicioPaginacion(): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + 1;
  }

  // Método para calcular el fin de la paginación (reemplaza Math.min en el template)
  getFinPaginacion(): number {
    return Math.min(this.paginaActual * this.elementosPorPagina, this.contactosFiltrados.length);
  }

  // Método para cambiar elementos por página
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

    const contacto: Contacto =
      this.formulario.value;

    // Determinar si es creación o actualización
    let request;

    if (this.esModoEdicion && this.contactoEditando) {
      // Modo actualización
      request = this.contactoService.actualizar(this.contactoEditando.id!, contacto);
    } else {
      // Modo creación
      request = this.contactoService.crear(contacto);
    }

    const sub = request.subscribe({

      next: () => {

        this.formulario.reset({
          estado: 'activo'
        });

        this.obtenerUbicacion();

        this.cargar();

        this.cerrarModal();
        
        this.resetModoEdicion();

        this.loading = false;
      },

      error: (err) => {

        console.error(err);

        this.loading = false;

        if (err.error?.message) {

          if (
            Array.isArray(
              err.error.message
            )
          ) {

            err.error.message.forEach(
              (msg: string) => {

                this.processErrorMessage(msg);

              }
            );

          } else {

            this.error =
              err.error.message;
          }
        }
      }
    });

    this.subscriptions.add(sub);
  }

  // Método para editar contacto
  editar(contacto: Contacto) {
    this.esModoEdicion = true;
    this.contactoEditando = contacto;
    
    // Cargar los datos del contacto en el formulario
    this.formulario.patchValue({
      nombre: contacto.nombre,
      celular: contacto.celular,
      email: contacto.email,
      ubicacion: contacto.ubicacion,
      estado: contacto.estado || 'activo'
    });
    
    this.abrirModal();
  }

  // Método para resetear el modo de edición
  resetModoEdicion() {
    this.esModoEdicion = false;
    this.contactoEditando = null;
  }

  processErrorMessage(msg: string) {

    const fieldMatch =
      msg.match(/^(\w+)\s+/);

    if (fieldMatch) {

      const field =
        fieldMatch[1];

      if (
        !this.validationErrors[field]
      ) {

        this.validationErrors[field] =
          [];
      }

      this.validationErrors[field]
        .push(msg);

    } else {

      this.serverErrors.push(msg);
    }
  }

  eliminar(id: number) {

    if (
      !confirm(
        '¿Eliminar contacto?'
      )
    ) {
      return;
    }

    const sub =
      this.contactoService
        .eliminar(id)
        .subscribe({

          next: () => {

            this.cargar();
          },

          error: (err) => {

            console.error(err);

            this.error =
              'Error al eliminar';
          }
        });

    this.subscriptions.add(sub);
  }

  abrirModal() {

    // Resetear errores
    this.validationErrors = {};
    this.serverErrors = [];
    
    // Si no es modo edición, resetear formulario y obtener ubicación
    if (!this.esModoEdicion) {
      this.formulario.reset({
        estado: 'activo'
      });
      this.obtenerUbicacion();
    }

    const modal =
      document.getElementById(
        'modal_contacto'
      ) as HTMLDialogElement;

    modal?.showModal();
  }

  cerrarModal() {

    const modal =
      document.getElementById(
        'modal_contacto'
      ) as HTMLDialogElement;

    modal?.close();
    
    // Resetear modo edición al cerrar el modal
    this.resetModoEdicion();
  }

  getFieldError(
    field: string
  ): string | null {

    if (
      this.validationErrors[field]
    ) {

      return this.validationErrors[field][0];
    }

    return null;
  }

  hasError(
    field: string
  ): boolean {

    return (
      !!this.validationErrors[field]
    );
  }

  // Método para obtener el título del modal
  getTituloModal(): string {
    return this.esModoEdicion ? 'Editar Contacto' : 'Nuevo Contacto';
  }

  // Método para obtener el texto del botón
  getTextoBoton(): string {
    return this.esModoEdicion ? 'Actualizar' : 'Guardar';
  }
}