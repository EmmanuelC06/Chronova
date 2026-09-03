# Flujo de trabajo: traer cambios sin dar credenciales

Claude trabaja en un contenedor en la nube que **no tiene acceso de escritura a tu repositorio**. Para traer sus cambios sin pasarle ningún token, se usa un `git bundle`: un archivo que contiene commits reales, con sus mensajes y su autoría, y que Git sabe leer como si fuera un repositorio remoto.

---

## La primera vez: subir el proyecto a GitHub

El proyecto ya viene con su historial de Git. No empieces de cero.

1. Crea un repositorio **vacío** en GitHub llamado `Chronova`. Sin README, sin `.gitignore`, sin licencia — cualquiera de esos crearía un commit que choca con el historial que ya tienes.

2. Desde la carpeta del proyecto:

```bash
cd Chronova
git remote add origin https://github.com/TU_USUARIO/Chronova.git
git push -u origin main
```

Listo. Tu repositorio queda con los commits ya escritos.

---

## Las siguientes veces: aplicar un bundle

Cuando Claude haga cambios, te entregará un archivo `chronova.bundle`. Para incorporarlo:

```bash
cd Chronova

# 1. Comprueba que el archivo está sano y qué contiene
git bundle verify /ruta/a/chronova.bundle

# 2. Trae los commits
git pull /ruta/a/chronova.bundle main

# 3. Revisa qué llegó antes de publicarlo
git log --oneline -5
git diff HEAD~1

# 4. Publícalo
git push
```

En Windows con PowerShell, la ruta va entre comillas si tiene espacios:

```powershell
git pull "C:\Users\corre\Downloads\chronova.bundle" main
```

### Qué esperar

- Los commits conservan el mensaje y la autoría originales, incluida la línea `Co-Authored-By`.
- No se pierde nada de lo tuyo: es un `pull` normal, con su fusión.
- Si tú y Claude tocaron el mismo archivo, Git avisará del conflicto igual que con cualquier compañero de equipo.

### Si sale conflicto

```bash
git status                    # ver qué archivos chocan
# editas los archivos y quitas las marcas <<<<<<< ======= >>>>>>>
git add .
git commit
```

---

## Antes de hacer push, siempre

```bash
cd backend
npm test          # las 166 pruebas deben pasar
npm run typecheck # no debe imprimir nada
```

Si algo falla, no publiques: avísale a Claude qué salió mal y lo corrige.

---

## Alternativas que evitan este paso manual

| Opción | Cómo funciona | Cuándo conviene |
|---|---|---|
| **Vincular tu computador** | Abres esta tarea desde la app de escritorio de Claude y eliges *Link to this computer*. Claude edita los archivos en tu carpeta y hace commit y push con **tus** credenciales. | Cuando quieres que Claude trabaje directo sobre tu repositorio, sin archivos de por medio. |
| **Claude Code** | Herramienta de terminal que corre en tu máquina, dentro de la carpeta del proyecto. | Para sesiones largas de desarrollo del día a día. |
| **Bundle** (este documento) | Un archivo por ronda de cambios. | Cuando no quieres instalar ni configurar nada. |

Ninguna de las tres requiere que compartas un token personal en el chat.
