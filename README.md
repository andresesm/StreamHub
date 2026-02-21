# StreamHUB

Sitio web estático para que fuinciona com odirectorio de creadores/streamers en formato de mini tarjetas y perfil compacto, con buscador, filtros por **tags** y **juegos**.

> Proyecto altamente vibecodeado, está hecho para funcionar bajo la estructura actual. Si cambias nombres de IDs/clases o el schema del JSON, es fácil que algo se rompa.

---

## Live Demo 
[https://streamhub.kuumedia.com.es/](https://streamhub.kuumedia.com.es/)

---

## Funciones destacables
- Grid de tarjetas responsive con carga incremental (infinite scroll).
- Buscador por nombre de usuario.
- Filtros dinámicos por:
  - Tags (desde creator.tags)
  - Juegos (desde creator.games)
- Contadores por filtro (cuántas personas coinciden con las categorías seleccionadas).
- Selector de plataforma (dropdown):
  - Plataformas: Twitch, Kick, Youtube, Tiktok (en ese orden).
  - Por defecto: Twitch seleccionada.
  - Colores del selector adaptados por plataforma (estilo “badge”).
- Botón “En vivo” solo disponible cuando la plataforma seleccionada es Twitch.
- Botón de papelera: limpia filtros (tags/juegos/búsqueda/en vivo) pero mantiene la plataforma seleccionada.
- Modal / popup de perfil por persona con:
  - Avatar, usuario, bio/tags/juegos (según datos disponibles).
  - Redes sociales (íconos + links).
  - Integración Twitch (cuando aplica): botón “Abrir perfil de Twitch”, y datos extra como seguidores/en vivo si están disponibles.
- Selector de tema (day/night).
- Splash screen de entrada.
- Modal extra de Información/FAQ al hacer click en el logo del footer (en vez de link externo).


---

### Estructura de creadores

NOTA:
streamPlatform define la plataforma principal y se usa para el filtro de plataforma.

```json
{
  "id": 1,
  "username": "Nombre",
  "streamPlatform": "twitch",
  "avatar_url": "assets/avatars/Nombre.png",
  "tags": ["Just Chatting", "Vtuber"],
  "games": ["Valorant", "Minecraft"],
  "bio": "Texto opcional",
  "followers": "12345",
  "residence": "Caracas, Venezuela",
  "nationality": "Venezuela",
  "socials": {
    "twitch": "handle",
    "kick": "handle",
    "x": "handle",
    "ig": "handle",
    "youtube": "handle",
    "tiktok": "handle",
    "email": "correo@dominio.com"
  }
}
```
Valores válidos para "streamPlatform":
- twitch
- kick
- youtube
- tiktok
- none (opcional interno; no se muestra como plataforma filtrable)

---

### Conocimientos y herramientas necesarias

* Conocimientos ***básicos-intermedios*** de Github, HTML, CSS, JS/JSON.
- Editor de código ***(Notepad++ / VS Code / etc).***

## Usabilidad

Si bien es un proyecto libre, se apreciaría la mención en caso de ser usado.


## Autor

[Billy Billete](https://billy.kuumedia.com.es/)
Co autor: [Lightdx](https://github.com/Lighdx)

## Créditos

* ChatGPT + PerplexityPro

## Descargo de responsabilidad

Proyecto solo por diversión, no lucrativo.
Las personas que figuran en la web llenaron un formulario accediendo a que su información sea pública.
Cualquier persona que use el template lo hace bajo su propia responsabilidad.