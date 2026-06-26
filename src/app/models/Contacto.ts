export interface Contacto {
  id?: number;
  nombre: string;
  celular?: string;
  email: string;
  ubicacion: string;
  estado: 'activo' | 'inactivo';
  created_at?: Date;
  updated_at?: Date;
}