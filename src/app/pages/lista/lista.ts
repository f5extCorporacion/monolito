import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  // Arrays de contactos
  contactos: Contacto[] = [];
  contactosFiltrados: Contacto[] = [];

  // Formulario
  formulario!: FormGroup;

  // Estados de carga y error
  loading: boolean = false;
  loadingLista: boolean = false;
  error: string | null = null;

  // Errores de validación
  validationErrors: { [key: string]: string[] } = {};
  serverErrors: string[] = [];

  // Estado de edición
  contactoEditando: Contacto | null = null;
  esModoEdicion: boolean = false;

  // Variables para paginación
  paginaActual: number = 1;
  elementosPorPagina: number = 8;
  totalPaginas: number = 1;

  // Variable para búsqueda
  terminoBusqueda: string = '';

  // Variable para el intervalo de polling
  private pollingInterval: any = null;
  private subscriptions: Subscription = new Subscription();
  private isBrowser: boolean;

  constructor(
    private contactoService: ContactoService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // Inicializar arrays
    this.contactos = [];
    this.contactosFiltrados = [];

    // Construir formulario
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

    // Cargar lista
    this.cargar();

    // Pedir geolocalización solo en navegador
    if (this.isBrowser) {
      this.obtenerUbicacion();
    }

    // Iniciar polling para cambios en tiempo real solo en navegador
    if (this.isBrowser) {
      this.iniciarPolling();
    }
  }

  ngOnDestroy(): void {
    // Limpiar el intervalo de polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    // Limpiar suscripciones
    this.subscriptions.unsubscribe();
  }

  // Getter para acceder fácilmente a los controles del formulario
  get f() {
    return this.formulario.controls;
  }

  /**
   * Obtiene la ubicación del usuario usando la API de geolocalización
   */
  obtenerUbicacion(): void {
    if (!this.isBrowser) return;
    
    if (!navigator.geolocation) {
      this.error = 'El navegador no soporta geolocalización';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        this.formulario.patchValue({
          ubicacion: `${lat}, ${lng}`
        });
      },
      (err: GeolocationPositionError) => {
        console.error(err);
        this.error = 'No fue posible obtener la ubicación actual';
      }
    );
  }

  /**
   * Carga la lista de contactos desde el servicio
   */
  cargar(): void {
    this.loadingLista = true;
    this.error = null;

    const sub = this.contactoService.listar().subscribe({
      next: (data: Contacto[]) => {
        this.contactos = data ?? [];
        this.filtrarContactos();
        this.loadingLista = false;
      },
      error: (err: any) => {
        console.error('Error al cargar contactos:', err);
        this.error = 'No se pudieron cargar los contactos';
        this.contactos = [];
        this.contactosFiltrados = [];
        this.calcularTotalPaginas();
        this.loadingLista = false;
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * Inicia el polling para detectar cambios en tiempo real
   */
  iniciarPolling(): void {
    if (!this.isBrowser) return;
    
    // Limpiar intervalo existente si hay
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Polling cada 5 segundos
    this.pollingInterval = setInterval(() => {
      this.verificarCambios();
    }, 5000);
  }

  /**
   * Verifica si hay cambios en el servidor
   */
  private ultimoEstado: string = '';

  verificarCambios(): void {
    if (!this.isBrowser) return;
    
    this.contactoService.listar().subscribe({
      next: (data: Contacto[]) => {
        const nuevoEstado = JSON.stringify(data);
        // Solo actualizar si hay cambios
        if (nuevoEstado !== this.ultimoEstado) {
          this.ultimoEstado = nuevoEstado;
          this.contactos = data ?? [];
          this.filtrarContactos();
        }
      },
      error: (err: any) => {
        console.error('Error en polling:', err);
      }
    });
  }

  /**
   * Detiene el polling
   */
  detenerPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Reinicia el polling
   */
  reiniciarPolling(): void {
    this.detenerPolling();
    this.iniciarPolling();
  }

  /**
   * Filtra los contactos según el término de búsqueda
   */
  filtrarContactos(): void {
    if (!this.contactos) {
      this.contactosFiltrados = [];
      this.calcularTotalPaginas();
      return;
    }

    if (!this.terminoBusqueda.trim()) {
      this.contactosFiltrados = [...this.contactos];
    } else {
      const termino = this.terminoBusqueda.toLowerCase().trim();
      this.contactosFiltrados = this.contactos.filter((contacto: Contacto) =>
        (contacto.nombre?.toLowerCase().includes(termino) || false) ||
        (contacto.email?.toLowerCase().includes(termino) || false) ||
        (contacto.celular?.includes(termino) || false)
      );
    }

    this.paginaActual = 1;
    this.calcularTotalPaginas();
  }

  /**
   * Busca contactos por término
   */
  buscarContactos(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.terminoBusqueda = input.value;
    this.filtrarContactos();
  }

  /**
   * Limpia el campo de búsqueda
   */
  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.filtrarContactos();
  }

  /**
   * Calcula el total de páginas
   */
  calcularTotalPaginas(): void {
    this.totalPaginas = Math.ceil(this.contactosFiltrados.length / this.elementosPorPagina);
    if (this.totalPaginas === 0) this.totalPaginas = 1;
  }

  /**
   * Obtiene los contactos de la página actual
   */
  get contactosPaginaActual(): Contacto[] {
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    return this.contactosFiltrados.slice(inicio, fin);
  }

  /**
   * Cambia a una página específica
   */
  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  /**
   * Va a la página anterior
   */
  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.paginaActual--;
    }
  }

  /**
   * Va a la página siguiente
   */
  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.paginaActual++;
    }
  }

  /**
   * Obtiene el array de números de página para mostrar
   */
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

  /**
   * Obtiene el índice de inicio de la paginación
   */
  getInicioPaginacion(): number {
    return (this.paginaActual - 1) * this.elementosPorPagina + 1;
  }

  /**
   * Obtiene el índice de fin de la paginación
   */
  getFinPaginacion(): number {
    return Math.min(
      this.paginaActual * this.elementosPorPagina,
      this.contactosFiltrados.length
    );
  }

  /**
   * Cambia la cantidad de elementos por página
   */
  cambiarElementosPorPagina(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.elementosPorPagina = parseInt(select.value, 10);
    this.calcularTotalPaginas();
    this.cambiarPagina(1);
  }

  /**
   * Guarda un contacto (nuevo o editado)
   */
  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.validationErrors = {};
    this.serverErrors = [];

    // Obtener valores del formulario
    const formValues = this.formulario.value;
    
    // Crear el contacto con tipado correcto
    const contacto: Omit<Contacto, 'id'> = {
      nombre: formValues.nombre,
      email: formValues.email,
      celular: formValues.celular || '',
      ubicacion: formValues.ubicacion,
      estado: formValues.estado || 'activo'
    };

    let request;

    if (this.esModoEdicion && this.contactoEditando) {
      request = this.contactoService.actualizar(this.contactoEditando.id!, contacto);
    } else {
      request = this.contactoService.crear(contacto);
    }

    const sub = request.subscribe({
      next: () => {
        this.formulario.reset({ estado: 'activo' });
        if (this.isBrowser) {
          this.obtenerUbicacion();
        }
        this.cerrarModal();
        this.resetModoEdicion();
        this.loading = false;
        
        // Recargar la lista después de guardar
        this.cargar();
        // Reiniciar el polling
        if (this.isBrowser) {
          this.reiniciarPolling();
        }
      },
      error: (err: any) => {
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
        } else {
          this.error = 'Error al guardar el contacto';
        }
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * Edita un contacto existente
   */
  editar(contacto: Contacto): void {
    this.esModoEdicion = true;
    this.contactoEditando = contacto;

    this.formulario.patchValue({
      nombre: contacto.nombre,
      celular: contacto.celular || '',
      email: contacto.email,
      ubicacion: contacto.ubicacion || '',
      estado: contacto.estado || 'activo'
    });

    this.abrirModal();
  }

  /**
   * Resetea el modo de edición
   */
  resetModoEdicion(): void {
    this.esModoEdicion = false;
    this.contactoEditando = null;
  }

  /**
   * Procesa mensajes de error
   */
  processErrorMessage(msg: string): void {
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

  /**
   * Elimina un contacto
   */
  eliminar(id: number): void {
    if (!confirm('¿Eliminar contacto?')) {
      return;
    }

    const sub = this.contactoService.eliminar(id).subscribe({
      next: () => {
        // Recargar la lista después de eliminar
        this.cargar();
        // Reiniciar el polling
        if (this.isBrowser) {
          this.reiniciarPolling();
        }
      },
      error: (err: any) => {
        console.error(err);
        this.error = 'Error al eliminar';
      }
    });

    this.subscriptions.add(sub);
  }

  /**
   * Abre el modal
   */
  abrirModal(): void {
    this.validationErrors = {};
    this.serverErrors = [];

    if (!this.esModoEdicion) {
      this.formulario.reset({ estado: 'activo' });
      if (this.isBrowser) {
        this.obtenerUbicacion();
      }
    }

    const modal = document.getElementById('modal_contacto') as HTMLDialogElement;
    if (this.isBrowser && modal) {
      modal.showModal();
    }
  }

  /**
   * Cierra el modal
   */
  cerrarModal(): void {
    const modal = document.getElementById('modal_contacto') as HTMLDialogElement;
    if (this.isBrowser && modal) {
      modal.close();
    }
    this.resetModoEdicion();
  }

  /**
   * Obtiene el error de un campo específico
   */
  getFieldError(field: string): string | null {
    if (this.validationErrors[field]) {
      return this.validationErrors[field][0];
    }
    return null;
  }

  /**
   * Verifica si un campo tiene error
   */
  hasError(field: string): boolean {
    return !!this.validationErrors[field];
  }

  /**
   * Obtiene el título del modal
   */
  getTituloModal(): string {
    return this.esModoEdicion ? 'Editar Contacto' : 'Nuevo Contacto';
  }

  /**
   * Obtiene el texto del botón
   */
  getTextoBoton(): string {
    return this.esModoEdicion ? 'Actualizar' : 'Guardar';
  }
}