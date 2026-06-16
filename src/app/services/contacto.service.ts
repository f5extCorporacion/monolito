import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { Contacto } from '../models/Contacto';
import { supabase } from '../supabase.client';

@Injectable({
  providedIn: 'root'
})
export class ContactoService {

  constructor() {}

  // Listar todos los contactos
  listar(): Observable<Contacto[]> {
    return from(
      supabase
        .from('contactos')
        .select('*')
        .order('id', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }

        return (data || []) as Contacto[];
      })
    );
  }

  // Obtener un contacto por ID
  obtener(id: number): Observable<Contacto> {
    return from(
      supabase
        .from('contactos')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }

        return data as Contacto;
      })
    );
  }

  // Crear un nuevo contacto
  crear(data: Contacto): Observable<Contacto> {
    return from(
      supabase
        .from('contactos')
        .insert([data])
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }

        return data as Contacto;
      })
    );
  }

  // Actualizar un contacto existente
  actualizar(
    id: number,
    data: Contacto
  ): Observable<Contacto> {

    return from(
      supabase
        .from('contactos')
        .update(data)
        .eq('id', id)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw error;
        }

        return data as Contacto;
      })
    );
  }

  // Eliminar un contacto
  eliminar(id: number): Observable<any> {

    console.log(
      'Eliminando contacto con ID:',
      id
    );

    return from(
      supabase
        .from('contactos')
        .delete()
        .eq('id', id)
    ).pipe(
      map(({ error }) => {

        if (error) {
          throw error;
        }

        return true;
      })
    );
  }
}