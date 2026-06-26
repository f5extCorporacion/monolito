import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { Contacto } from '../models/Contacto';

@Injectable({
  providedIn: 'root'
})
export class ContactoService {
  private readonly STORAGE_KEY = 'contactos';
  private contactos: Contacto[] = [];

  constructor() {
    this.cargarDatos();
  }

  /**
   * Carga los datos desde localStorage
   */
  private cargarDatos(): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        this.contactos = JSON.parse(data);
        console.log(`✅ ${this.contactos.length} contactos cargados desde localStorage`);
      } else {
        this.contactos = [];
        // Inicializar con datos de ejemplo si está vacío
        this.inicializarDatosEjemplo();
      }
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      this.contactos = [];
    }
  }

  /**
   * Guarda los datos en localStorage
   */
  private guardarDatos(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.contactos));
      console.log('✅ Datos guardados en localStorage');
    } catch (error) {
      console.error('❌ Error al guardar datos:', error);
    }
  }

  /**
   * Inicializa con datos de ejemplo si no hay datos
   */
  private inicializarDatosEjemplo(): void {
    const contactosEjemplo: Contacto[] = [
      {
        id: 1,
        nombre: 'Rangers Root',
        email: 'juan@email.com',
        celular: '555-1234',
        ubicacion: '-888.88, -68.3816',
        estado: 'activo',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    this.contactos = contactosEjemplo;
    this.guardarDatos();
    console.log('📝 Datos de ejemplo inicializados');
  }

  /**
   * Obtiene todos los contactos
   */
  listar(): Observable<Contacto[]> {
    try {
      // Ordenar por ID descendente (más reciente primero)
      const contactosOrdenados = [...this.contactos].sort((a, b) => 
        (b.id || 0) - (a.id || 0)
      );
      return of(contactosOrdenados);
    } catch (error) {
      console.error('❌ Error al listar contactos:', error);
      return of([]);
    }
  }

  /**
   * Crea un nuevo contacto
   */
  crear(contacto: Omit<Contacto, 'id'>): Observable<Contacto> {
    try {
      // Generar nuevo ID
      const maxId = this.contactos.reduce((max, c) => Math.max(max, c.id || 0), 0);
      const nuevoId = maxId + 1;

      const nuevoContacto: Contacto = {
        ...contacto,
        id: nuevoId,
        created_at: new Date(),
        updated_at: new Date(),
        estado: contacto.estado || 'activo'
      };

      this.contactos.push(nuevoContacto);
      this.guardarDatos();

      console.log('✅ Contacto creado:', nuevoContacto);
      return of(nuevoContacto);
    } catch (error) {
      console.error('❌ Error al crear contacto:', error);
      return throwError(() => new Error('Error al crear el contacto'));
    }
  }

  /**
   * Actualiza un contacto existente
   */
  actualizar(id: number, contacto: Partial<Contacto>): Observable<Contacto> {
    try {
      const index = this.contactos.findIndex(c => c.id === id);
      if (index === -1) {
        return throwError(() => new Error(`Contacto con ID ${id} no encontrado`));
      }

      const contactoActualizado = {
        ...this.contactos[index],
        ...contacto,
        updated_at: new Date()
      };

      this.contactos[index] = contactoActualizado;
      this.guardarDatos();

      console.log('✅ Contacto actualizado:', contactoActualizado);
      return of(contactoActualizado);
    } catch (error) {
      console.error('❌ Error al actualizar contacto:', error);
      return throwError(() => new Error('Error al actualizar el contacto'));
    }
  }

  /**
   * Elimina un contacto por ID
   */
  eliminar(id: number): Observable<void> {
    try {
      const index = this.contactos.findIndex(c => c.id === id);
      if (index === -1) {
        return throwError(() => new Error(`Contacto con ID ${id} no encontrado`));
      }

      this.contactos.splice(index, 1);
      this.guardarDatos();

      console.log(`✅ Contacto ${id} eliminado`);
      return of(void 0);
    } catch (error) {
      console.error(`❌ Error al eliminar contacto ${id}:`, error);
      return throwError(() => new Error('Error al eliminar el contacto'));
    }
  }

  /**
   * Obtiene un contacto por ID
   */
  obtenerPorId(id: number): Observable<Contacto | null> {
    try {
      const contacto = this.contactos.find(c => c.id === id) || null;
      return of(contacto);
    } catch (error) {
      console.error(`❌ Error al obtener contacto ${id}:`, error);
      return of(null);
    }
  }

  /**
   * Busca contactos por término
   */
  buscar(termino: string): Observable<Contacto[]> {
    try {
      const terminoLower = termino.toLowerCase().trim();
      const resultados = this.contactos.filter((contacto: Contacto) =>
        (contacto.nombre?.toLowerCase().includes(terminoLower) || false) ||
        (contacto.email?.toLowerCase().includes(terminoLower) || false) ||
        (contacto.celular?.includes(termino) || false)
      );
      return of(resultados);
    } catch (error) {
      console.error('❌ Error al buscar contactos:', error);
      return of([]);
    }
  }

  /**
   * Obtiene el total de contactos
   */
  contar(): Observable<number> {
    try {
      return of(this.contactos.length);
    } catch (error) {
      console.error('❌ Error al contar contactos:', error);
      return of(0);
    }
  }

  /**
   * Elimina todos los contactos
   */
  eliminarTodos(): Observable<void> {
    try {
      this.contactos = [];
      this.guardarDatos();
      console.log('🗑️ Todos los contactos eliminados');
      return of(void 0);
    } catch (error) {
      console.error('❌ Error al eliminar todos los contactos:', error);
      return throwError(() => new Error('Error al eliminar todos los contactos'));
    }
  }

  /**
   * Exporta los datos a JSON
   */
  exportarDatos(): string {
    return JSON.stringify(this.contactos, null, 2);
  }

  /**
   * Importa datos desde JSON
   */
  importarDatos(jsonData: string): Observable<void> {
    try {
      const datos = JSON.parse(jsonData);
      if (Array.isArray(datos)) {
        this.contactos = datos;
        this.guardarDatos();
        console.log('✅ Datos importados correctamente');
        return of(void 0);
      } else {
        return throwError(() => new Error('Formato de datos inválido'));
      }
    } catch (error) {
      console.error('❌ Error al importar datos:', error);
      return throwError(() => new Error('Error al importar los datos'));
    }
  }
}