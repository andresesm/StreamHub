<p align="center">
  <img src="assets/WSSH.svg" alt="Logo de StreamHUB" width="450">
</p>

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![CSS](https://img.shields.io/badge/CSS-563d7c?&style=flat&logo=css3&logoColor=white) [![Netlify Status](https://api.netlify.com/api/v1/badges/f5c92cce-a37d-4433-8be2-1e90dab5f819/deploy-status)](https://app.netlify.com/projects/streamhubve/deploys) ![X](https://img.shields.io/badge/X-000000?style=flat&logo=x&logoColor=white)

<p align="center">
  Directorio web estático de creadores y streamers, con fichas compactas, páginas de perfil, filtros por etiquetas y juegos, selector de plataforma y soporte para tema claro/oscuro.
</p>

> Proyecto hecho sobre una estructura muy concreta. Si cambias nombres de clases, IDs, rutas o el esquema del JSON, es bastante probable que el sitio entero deje de funcionar.

---

## Demo

https://streamhub.kuumedia.com.es/ 

---

## Qué incluye

- Directorio responsive de creadores con carga incremental. 
- Buscador por nombre de usuario. 
- Filtros dinámicos por etiquetas y juegos. 
- Selector de plataforma principal con prioridad para Twitch, Kick, YouTube y TikTok. 
- Botón de “En vivo” para Twitch. 
- Limpieza de filtros sin perder la plataforma seleccionada.
- Páginas de perfil individuales para cada creador. 
- Integración visual con redes sociales mediante SVG y estilos por plataforma. 
- Tema day/night persistente mediante `localStorage`.
- Página FAQ y páginas auxiliares del proyecto. 

---

## Estructura general

El proyecto está planteado como un sitio estático con varias páginas y recursos compartidos. 

```text
/
├── index.html
├── directorio/
│   └── index.html
├── FAQ/
│   └── index.html
├── registro/
│   └── index.html
├── billy/
│   └── index.html
├── u/
│   └── CARPETAporUSUARIO
│       └── index.html
├── css/
├── js/
├── assets/
│   ├── avatars/
│   ├── fonts/
│   └── svg/
└── data/
```

---

## Funcionalidades

### Directorio
- Grid de tarjetas responsive.
- Infinite scroll / carga progresiva.
- Filtro por nombre.
- Filtros por etiquetas.
- Filtros por juegos.
- Selector de plataforma.
- Estado “En vivo” cuando aplica. [file:5]

### Perfiles
- Avatar.
- Username.
- Descripción.
- Residencia y nacionalidad.
- Redes sociales.
- Juegos y etiquetas del creador. 

### UI y experiencia
- Header unificado.
- Tema claro/oscuro.
- Componentes reutilizables.
- Iconografía SVG con color adaptado al tema mediante `currentColor` o máscaras CSS. 

### FAQ y páginas auxiliares
- Preguntas frecuentes del proyecto.
- Estado general del sitio.
- Información de contacto y consideraciones del proyecto. 

---

## Datos de creadores

Todos los datos son proporcionados por los mismos creadores mediante un formulario Google, luego convertido en CSV normalizado y llevado a JSON.

### Ejemplo de objeto

```json
{
  "id": 1,
  "username": "Nombre",
  "streamPlatform": "twitch",
  "avatar_url": "assets/avatars/Nombre.webp",
  "tags": ["Just Chatting", "Vtuber"],
  "games": ["Valorant", "Minecraft"],
  "bio": "Texto opcional",
  "followers": "`XXXXX`",
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

### Valores válidos para `streamPlatform`

- `twitch`
- `kick`
- `youtube`
- `tiktok`
- `none` (uso interno, no visible como filtro)

---

## Requisitos

- Conocimientos básicos o intermedios de HTML, CSS, JavaScript y JSON. 
- Editor de código como VS Code, Notepad++ o similar. 

---

## Consideraciones técnicas

- El proyecto depende bastante de IDs, clases y rutas concretas. 
- El sistema de tema usa `data-theme` sobre el elemento raíz y persistencia con `localStorage`. 
- Parte de la interfaz reutiliza variables CSS para colores, bordes, superficies y estados visuales. 
- Los iconos sociales pueden pintarse según el color del tema usando máscaras CSS y `currentColor`.

---

## Edición y mantenimiento

Si vas a extender el proyecto, intenta respetar estas reglas:

- No cambies nombres de IDs o clases sin revisar los JS asociados. 
- No cambies rutas de `assets`, `css` o `js` sin ajustar todos los enlaces relativos. 
- Mantén el mismo esquema de datos en los creadores. 
- Si agregas nuevas páginas, reutiliza el mismo sistema de tema y navegación. 

---

## Uso

El proyecto es libre, pero se agradece la mención si lo reutilizas o adaptas. 

---

## Autoría

Constructor: [Billy Billete](https://billy.kuumedia.com.es/)  
Integración de Twitch: [Lightdx](https://github.com/Lighdx) 

---

## Créditos

- ChatGPT Business
- Perplexity Pro 
- 404 page by [Jon Kantner](https://codepen.io/jkantner)

---

## Descargo

Proyecto hecho por diversión y sin fines de lucro. Las personas listadas en la web enviaron su información voluntariamente para aparecer de forma pública, y cualquier reutilización del template queda bajo responsabilidad de quien lo implemente.