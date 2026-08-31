/**
 * PUERTO Reloj.
 *
 * ¿Por que no llamar simplemente a new Date() dentro de los casos de uso?
 * Porque entonces las pruebas dependerian de la hora real y no se podria
 * verificar "que pasa si el paciente confirma la toma 3 horas tarde".
 * Con este puerto, en produccion se inyecta el reloj del sistema y en las
 * pruebas un reloj congelado en una fecha concreta.
 */
export interface Reloj {
  ahora(): Date;
}
