/**
 * PUERTO de cifrado de contrasenas.
 *
 * El dominio nunca ve una contrasena en claro mas alla del instante del
 * registro o del login. Si manana se cambia bcrypt por argon2, solo se
 * reemplaza el adaptador: ni el dominio ni los casos de uso se enteran.
 */
export interface CifradorDeContrasenas {
  cifrar(contrasenaEnClaro: string): Promise<string>;
  verificar(contrasenaEnClaro: string, contrasenaCifrada: string): Promise<boolean>;
}
