import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contacto } from '../models/Contacto';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContactoService {

  api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Listar todos los contactos
  listar(): Observable<Contacto[]> {
    return this.http.get<Contacto[]>(this.api + '/contactos');
  }

  // Obtener un contacto por ID
  obtener(id: number): Observable<Contacto> {
    return this.http.get<Contacto>(`${this.api}/contactos/${id}`);
  }

  // Crear un nuevo contacto
  crear(data: Contacto): Observable<Contacto> {
    return this.http.post<Contacto>(this.api + '/contactos', data);
  }

  // Actualizar un contacto existente
  actualizar(id: number, data: Contacto): Observable<Contacto> {
    return this.http.patch<Contacto>(`${this.api}/contactos/${id}`, data);
  }

  // Eliminar un contacto
  eliminar(id: number): Observable<any> {
    console.log('Eliminando contacto con ID:', id);
    return this.http.delete(`${this.api}/contactos/${id}`);
  }
}