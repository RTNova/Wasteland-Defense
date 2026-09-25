<div align="center">

# ☢️ WASTELAND DEFENSE

**Tower Defense apocalíptico construido con React + TypeScript. 9 torres, 6 tipos de enemigos, efectos de estado, modo Endless procedural y un Bestiario con simulación de combate en vivo.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-orange)

**[🎮 Jugar ahora → wasteland-defense.vercel.app](https://wasteland-defense.vercel.app)**

</div>

---

## 📖 Tabla de contenidos

- [Sobre el proyecto](#-sobre-el-proyecto)
- [Características](#-características)
- [Cómo se juega](#-cómo-se-juega)
- [Torres](#-torres)
- [Enemigos](#-enemigos)
- [Arquitectura técnica](#-arquitectura-técnica)
- [Estructura del repositorio](#-estructura-del-repositorio)
- [Instalación](#-instalación)
- [Roadmap](#-roadmap)
- [Nota técnica: limpieza pendiente](#-nota-técnica-limpieza-pendiente)
- [Autor](#-autor)

---

## 🎯 Sobre el proyecto

**Wasteland Defense** es un tower defense ambientado en un páramo post-apocalíptico: mutantes, tanques blindados y jefes que se multiplican al morir avanzan por un camino fijo mientras el jugador coloca defensas para detenerlos antes de que lleguen al final.

Todo el juego corre **100% en el cliente**, renderizado con `<canvas>` y un bucle de simulación propio (sin motor de terceros tipo Phaser): posiciones, colisiones, RNG de oleadas, efectos de estado y renderizado están escritos a mano en TypeScript. El progreso (perfiles, Tech Points, mejoras) se guarda en `localStorage`, sin backend.

Esto es un proyecto aún en desarrollo, por lo que todavía no cumple ni con mis expectativas ni con el 100% de su descripción.

---

## ✨ Características

- 🗺️ **7 mapas** con dificultad creciente (Fácil → Extremo), cada uno con su propio trazado de camino y, en los más avanzados, **obstáculos** (edificios, agua, escombros) que decoran el terreno.
- 🏰 **9 tipos de torre**, cada una con mecánica única (cadena eléctrica, beam perforante, homing global, buff de área...) y **7 niveles de mejora**, con una habilidad especial exclusiva al alcanzar el nivel máximo.
- 🧟 **6 tipos de enemigo**, incluyendo un **jefe matrioska** que al morir genera 3 jefes normales (que a su vez generan tanques al morir) y una **sanadora** que cura en área y hace un heal-burst al morir.
- 🔥 **Sistema de efectos de estado** completo: quemadura (daño por tiempo), veneno (% de vida máxima por segundo), ralentización por ácido, vulnerabilidad (+15% de daño recibido), reducción de curación y congelación.
- ♾️ **Modo Endless** con generación procedural de oleadas más allá del contenido fijo, y recompensas de Tech Points cada 10 oleadas.
- 🎚️ **Escalado dinámico de dificultad**: la vida y la recompensa de cada enemigo crecen con la oleada (`hp × (1 + oleada^1.6 / 12)`), y el límite de torres colocables aumenta cada 10 oleadas.
- 🛒 **Meta-progresión persistente**: una moneda global (Tech Points) que se gasta en 4 mejoras permanentes (daño, alcance, descuento de coste, dinero inicial), compartidas entre todas las partidas de un perfil.
- 👤 **Sistema de perfiles locales** (hasta 3), cada uno con su propio progreso guardado en `localStorage`.
- 📖 **Bestiario interactivo**: cada torre y enemigo tiene una ficha con sus estadísticas reales y, para las torres, una **simulación de combate en vivo** que reutiliza el mismo motor de renderizado y las mismas reglas de daño que la partida real (no es una animación falsa).
- 🎮 **Controles de partida**: pausa, velocidad x2, auto-avance de oleadas, drag & drop para colocar torres con vista previa de rango y validación de colocación en tiempo real.
- 🛠️ **Modo desarrollador** activable desde el menú (herramientas de depuración en partida).

---

## 🎮 Cómo se juega

1. Elige o crea un **perfil de comandante**.
2. Selecciona **Campaign** (mapas con número de oleadas fijo) o **Endless Ops** (oleadas infinitas con escalado procedural).
3. Elige un mapa y despliega torres arrastrándolas desde el panel lateral hasta el terreno.
4. Pulsa ▶️ para lanzar cada oleada; gana dinero por cada enemigo eliminado y al completar la oleada.
5. **Mejora** las torres existentes (hasta nivel 7, con una habilidad especial en el nivel máximo) o véndelas para recuperar parte de la inversión.
6. Al completar un mapa (modo Campaign) ganas **Tech Points**, la moneda meta que se gasta en el **Armory** (mejoras permanentes que persisten entre partidas).
7. Consulta el **Bestiario** para estudiar a fondo cada torre y enemigo antes de decidir tu estrategia.

---

## 🏰 Torres

| Torre | Tipo de daño | Rasgo distintivo | Habilidad de nivel 7 |
|---|---|---|---|
| **Scavenger** | Bala única | Barata y fiable | Munición explosiva |
| **Ranger** | Bala única | Rango larguísimo, alto daño | Sus impactos dejan al objetivo Vulnerable (+15% daño) |
| **Sentry** | Bala única | Cadencia altísima | Mecánica de *spin-up*: cuanto más dispara, más rápido va |
| **Incinerator** | Cono de fuego | Daño en área continuo, reduce curación enemiga | Fuego azul: más daño y mayor reducción de curación |
| **Chemist** | Bomba de impacto | Bombas pegajosas de área | Veneno oscuro: daño por tiempo permanente |
| **Tesla Coil** | Cadena eléctrica | Rebota entre varios enemigos cercanos | Los arcos aturden (congelan) brevemente |
| **Ion Cannon** | Beam instantáneo | Atraviesa a todos los enemigos en línea | Alterna beam rojo (quemadura) y azul (charco de ácido) |
| **Hunter** | Flecha homing | Rango global, sigue a un único objetivo | Las bajas otorgan munición para ráfagas rápidas |
| **Command Link** | — (soporte) | No hace daño; da +15% de rango a torres cercanas | Además, +15% de daño y velocidad a las torres cercanas |

---

## 🧟 Enemigos

| Enemigo | Rol | Rasgo |
|---|---|---|
| **Walker** | Fodder básico | Lento, barato de matar |
| **Runner** | Fodder rápido | Poca vida, pero difícil de alcanzar |
| **Tank** | Bloqueo | Mucha vida; **al morir genera 3 Walkers** |
| **Boss** | Hito de oleada | Vida alta; **al morir genera 3 Tanks** |
| **Matryoshka** | Élite | La cadena de generación definitiva: **al morir genera 3 Boss**, que a su vez generan Tanks, que generan Walkers |
| **Healer** | Soporte enemigo | Cura en área a otros enemigos periódicamente y hace un **heal-burst** al morir |

---

## 🧱 Arquitectura técnica

- **Stack:** React 19 + TypeScript + Vite 6, sin framework de juegos externo. UI con TailwindCSS (vía CDN).
- **Bucle de juego:** un único `requestAnimationFrame` dentro de `GameCanvas.tsx` que actualiza posiciones, cooldowns, colisiones y efectos de estado en refs mutables (`useRef`) para evitar el coste de re-renderizar React 60 veces por segundo; el estado de React (`useState`) solo se toca para lo que realmente necesita disparar un re-render de la UI (dinero, vidas, oleada).
- **Targeting:** cada torre filtra enemigos dentro de su rango efectiva y ataca al que más distancia ha recorrido por el camino (`distanceTraveled`), no al más cercano en línea recta.
- **Colisión con el camino:** el daño del Ion Cannon usa distancia punto-a-segmento (`getDistanceToLine`) para determinar qué enemigos atraviesa el beam.
- **Generación de oleadas:** `generateWaves()` construye oleadas predefinidas con composición y espaciado de spawn específicos; más allá del contenido fijo, `startNextWave()` genera oleadas de forma procedural escalando según el número de oleada.
- **Renderizado desacoplado:** toda la lógica de dibujo (`drawTower`, `drawEnemy`, `drawProjectile`, `drawGroundEffect`) vive en `RenderUtils.ts`, separada de la lógica de simulación — el mismo código de dibujo se reutiliza tanto en la partida real como en las vistas previas del Bestiario y del panel de compra de torres.
- **Persistencia:** `PlayerProgress` y los perfiles se serializan a JSON en `localStorage`; no hay backend ni base de datos.

---

## 📁 Estructura del repositorio

```
Wasteland-Defense/
├── components/
│   ├── game/
│   │   ├── GameCanvas.tsx      # Bucle de juego, input, UI de partida
│   │   └── RenderUtils.ts      # Funciones de dibujo en <canvas>
│   └── ui/
│       ├── MainMenu.tsx
│       ├── MapSelection.tsx
│       ├── ProfileSelection.tsx
│       ├── Shop.tsx             # Armory (mejoras permanentes)
│       └── Bestiary.tsx         # Ficha + simulación de combate
├── config/
│   └── constants.ts             # Mapas, definición de torres/enemigos, generateWaves
├── types/
│   └── index.ts                 # Tipos compartidos (Enemy, Tower, Projectile...)
├── App.tsx                      # Enrutado de vistas y estado global de perfil/progreso
├── index.tsx / index.html
├── package.json / vite.config.ts / tsconfig.json
└── README.md
```

> ⚠️ Ver la nota más abajo sobre `types.ts` y `constants.ts` en la raíz — son restos obsoletos de una versión de legado.

---

## 🚀 Instalación (En caso de que se quiera jugar en local)


**Requisitos:** Node.js

```bash
git clone https://github.com/RTNova/Wasteland-Defense.git
cd Wasteland-Defense
npm install
npm run dev
```

La app se sirve en `http://localhost:3000`.

Aun así, dispone de su versión online (puedes ver el enlace en la cabecera del repo y aquí)
**[🎮 Jugar ahora → wasteland-defense.vercel.app](https://wasteland-defense.vercel.app)**

---

## 🗺️ Roadmap

- [x] 9 torres con niveles y habilidades de nivel máximo
- [x] 6 enemigos con mecánicas propias (generación en cadena, curación)
- [x] Modo Endless con generación procedural
- [x] Bestiario con simulación de combate real
- [x] Sistema de perfiles y meta-progresión persistente
- [ ] Guardado en la nube / cuentas de usuario
- [ ] Más mapas y torres
- [ ] Tabla de puntuaciones global (actualmente todo es local)
- [ ] Sonido y música
- [ ] Balanceo adicional en oleadas tardías del modo Endless

---

## 🧹 Nota técnica: limpieza pendiente

El repositorio contiene actualmente **dos definiciones de tipos y constantes duplicadas**:

- `/types.ts` y `/constants.ts` (raíz) — versión antigua: 4 enemigos, 7 torres, 3 mapas, sin niveles ni obstáculos.
- `/types/index.ts` y `/config/constants.ts` — versión actual y activa: 6 enemigos, 9 torres, 7 mapas, con niveles, obstáculos y efectos de estado.

Todos los componentes reales (`App.tsx`, `GameCanvas.tsx`, `RenderUtils.ts`, `Bestiary.tsx`...) importan desde `types/index` y `config/constants`, por lo que los archivos de la raíz son restos huérfanos de una iteración anterior que conviene eliminar para evitar confusión.

---

## 👤 Autor

**Borja Corral Pérez**

- GitHub: [@RTNova](https://github.com/RTNova)
- LinkedIn: [Borja Corral Pérez](https://www.linkedin.com/in/borja-corral-pérez-080811317)

---

<div align="center">

⭐ Si el proyecto te resulta útil o interesante, ¡deja una estrella en el repositorio!

</div>
