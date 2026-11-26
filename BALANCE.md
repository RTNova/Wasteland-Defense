# BALANCE.md: seguimiento de balance

Documento vivo. Sirve para decidir qué torres y enemigos subir o bajar, con números en lugar de intuición, y para dejar registrado qué se decidió y por qué.

- Cifras generadas el 26/11/2026 sobre el commit `c8c39d5` (rama `main`).
- Regenerar el informe: `npm run balance`. Ejecutar las pruebas: `npm test`.
- Las fórmulas están en `config/balance.ts`. `GameCanvas.tsx` las importa, así que el análisis y el juego usan las mismas.
- Los tests están en `tests/balance.test.ts` y el análisis en `scripts/balance-analysis.ts`.

## Cómo leer los números (y sus límites)

Es un **análisis estático**: calcula con los datos de `config/` y no simula combate.

- **DPS nominal** = `daño * 60 / cooldown` contra un solo objetivo. No incluye área, perforación, cadenas, veneno, quemadura ni aturdimiento. Eso penaliza a Ion Cannon, Tesla, Chemist, Earthshaker y Pulverizer, y no mide el valor de apoyo del Command Link.
- **DPS/1000$** = DPS dividido por el dinero invertido (compra + mejoras) hasta ese nivel. Es una medida de eficiencia de coste.
- **Relativo a la mediana**: 1.00 es la torre típica. Más de 3 o menos de 0.3 son señales para mirar, no sentencias.
- No hay simulación: la colocación, las rutas, el tiempo de ráfaga del Incinerator y las habilidades de nivel 7 no están modeladas. Para conclusiones firmes hace falta jugar o simular (ver "Siguientes pasos").
- Las oleadas tienen aleatoriedad (Ninja e Ice Mage). El informe da cota inferior (no aparecen) y superior (aparecen siempre).

## Seguimiento de hipótesis (de tus notas)

Estado: `Apoyada` = los números respaldan la nota. `No apoyada` = los números dicen lo contrario. `Sin datos` = el análisis estático no puede decidirlo. `Pendiente` = nadie lo ha cambiado todavía.

| Nota | Evidencia estática | Veredicto | Decisión |
|---|---|---|---|
| Nerf Lanzallamas (Incinerator) | **Aplicado en el PR de nerf** (ver sección "Nerf del Incinerator"). Análisis original: | DPS nominal L7 = 2610, el doble que cualquier otra torre. Cada mejora multiplica el daño por 1.52 y baja el cooldown un 10% (con mínimo 2), así que el DPS sube ~1.69x por nivel hasta tocar ese mínimo. 4.3x la mediana de DPS/$ en L7. Falta saber su tiempo de ráfaga real. | Apoyada | Pendiente |
| Nerf Sentry | L1 y L7 en 6.9x y 4.0x la mediana de DPS/$. Con 300$ iguala el DPS de nivel 1 del Incinerator (700$). | Apoyada | Pendiente |
| Nerf Ion Cannon | 0.44x la mediana en L1 y 0.28x en L7 (50 DPS por 1300$). Solo compensaría con perforación, que este análisis no mide. | No apoyada con estos datos | Pendiente: medir con simulación antes de tocar |
| Buff Scavenger | Es de las más eficientes (6.9x la mediana en L1, igual que Sentry, y 4.2x en L7) y la más barata (100$). | No apoyada con estos datos | Pendiente: ¿el problema es alcance (150) o escalado? Decidir |
| Buff Ranger | 51 DPS por 450$ en L1 (1.3x), 0.84x en L7 con alcance 330 a 581. Es la torre normal más débil por dólar. | Apoyada (débil) | Pendiente |
| Buff Hunter | 2.1x la mediana en L1 y 1.3x en L7, con alcance global. El DPS nominal es dudoso (una flecha a la vez). | Sin datos | Pendiente |
| Mucho dinero | Dinero inicial 450 (4 Scavengers). La vida por dólar de ingreso sube de 3.7 (oleada 1) a 132 (oleada 30): la economía se queda atrás de la dificultad, sobre todo desde la oleada 12. Es posible que el exceso esté solo en las primeras oleadas. | Sin datos / matizada | Pendiente: ver oleadas 1 a 8 |
| Torres pegan mucho | Daño por mejora: x1.37 por nivel en torres normales (1.05 x 1.30) y x1.52 en Incinerator/Pulverizer. En L7 una torre normal multiplica el DPS por ~6, y el Pulverizer por 22. | Apoyada en Pulverizer e Incinerator | Pendiente |
| Enemigos más grandes, quitan más vida | `damageToPlayer`: Walker 2, Runner 4, Tank 10, Boss 30, Matrioska 50, Healer 15. Hay 100 vidas, así que 2 Matrioskas y un Boss quitan 130. | Sin datos | Pendiente |
| Las torres tienen hitbox | Hoy solo hay colisión de colocación (40 px entre torres, 35 px al camino). No hay hitbox para proyectiles de enemigos. | Sin datos | Pendiente: aclarar qué se quiere |

### Hallazgos que no estaban en las notas

1. Pulverizer sube de 30 a 657 de DPS nominal en L7 (22x), por usar la rama de mejora del Incinerator (daño x1.52 por nivel). Puede ser intencionado (apoyo con aturdimiento) pero es el mayor salto del juego.
2. El Healer cuesta mucho de matar (1450 de vida base) y paga 10: 424 de vida por punto de recompensa en la oleada 10, contra 18 a 65 del resto. Matarlo no compensa (OBJ-6).
3. Las oleadas 5 y 10 tienen picos: la 5 trae 8075 de vida total (vs 1536 en la 3) y en la 10 aparece el primer Boss, que con sus Tanks y Walkers suma 10440 de vida efectiva.
4. Un Boss "vale" 13 unidades y una Matrioska 40 (incluyen lo que sueltan). La Matrioska de la oleada 20 tiene 29.8k de vida propia y 114k con todo lo que suelta, y esa oleada es la que sale como 114292 de vida total en la tabla de abajo. Paga 1497 en total.
5. En Reactor Core un Walker tarda 78 s en recorrer el camino, más del doble que en los demás mapas (21 a 38 s). Las torres tienen más tiempo para disparar, así que su dificultad EXTREME no sale de la vida de los enemigos. No lo he simulado.
6. El README anunciaba 9 torres y 6 enemigos. El código tiene 11 torres y 8 tipos de enemigo (ver README actualizado).

## Estado de las ideas de tus notas (comprobado en el código)

Las líneas que tenías entre paréntesis las he contrastado con el código el 26/11/2026.

| Idea | Estado en el código |
|---|---|
| Botón 2x de velocidad, botón auto-play | Hecho: `gameSpeed` (1 o 2) y `autoPlay` en `GameCanvas.tsx`. |
| Ventana de Win/Lose | Derrota hecha (pantalla DEFEAT con oleadas y enemigos). Victoria: hay estado, fanfarria y resumen por oleada (`PostWaveSummaryModal`); no he verificado una ventana de victoria dedicada. |
| Más mapas, más dificultad, más torres, más enemigos | Hecho en parte: 7 mapas, 3 niveles de dificultad, 11 torres, 8 enemigos. |
| Mejores mapas procedurales | No encontrado: los mapas son datos fijos en `MAPS`. Lo procedural es la generación de oleadas Endless. |
| Mejoras para las torres, con mejora final | Hecho: 7 niveles, habilidad exclusiva en el nivel 7. |
| Cada 10 oleadas un jefe | Hecho y más: Boss en la 10 y la 15, Matrioska en la 20, jefes cada 5 oleadas. |
| Tanque que suelta tres rojos como matrioska | Cubierto por la cadena: Matrioska, que suelta 3 Boss (rojos), que sueltan 3 Tank. El Tank suelta 3 Walkers (verdes), no rojos. |
| Líder de batalla con curación de 350 | Radio se mantiene en 200 (decisión posterior del usuario, en vez de 350). Al morir deja una zona de curación de 3,5 s: una aguja gira una vuelta desde arriba y va rellenando el área; cura 3 % de vida máxima cada 0,5 s y luego desaparece. |
| Mago de hielo que dispara y ralentiza torres | Hecho: ICE_MAGE ataca a torres cercanas y las congela (ataque más lento, 3 s). |
| Ninja rápido que paraliza torres 3 s y quita 1 vida | Corregido: es el más rápido (2.0), paraliza 3 s (180 frames) y quita 1 vida. |
| Centinela con escudo anti-aturdimiento | No hecho. |
| Mezclar habilidades de dos torres | No hecho. |
| Torre que roba stats, torre Brujo | No hecho. |

## Objetivos de balance (tests)

En `tests/balance.test.ts`, bloque "objetivos de balance". Los marcados `it.fails` describen un problema que existe hoy: pasan mientras el problema siga ahí y se ponen en rojo cuando lo arregles. Entonces quitas `.fails` y actualizas esta tabla.

| Id | Objetivo | Hoy |
|---|---|---|
| OBJ-1 | Ninguna torre supera 3x la mediana de DPS/$ en L7 | No se cumple (Incinerator, Scavenger, Sentry) |
| OBJ-2 | Ninguna torre supera 3x la mediana en L1 | No se cumple (Scavenger, Sentry) |
| OBJ-3 | DPS L7 no supera 8x el de L1 | No se cumple (Pulverizer 22x, Incinerator 14x) |
| OBJ-4 | Ninguna torre baja de 0.3x la mediana en L7 | No se cumple (Tesla, Ion Cannon, Chemist) |
| OBJ-5 | Salvo el Healer, ningún enemigo supera 100 de vida por recompensa (oleada 10) | Se cumple |
| OBJ-6 | El Healer rinde al menos 1/100 de su vida | No se cumple (1/424) |

## Registro de cambios de balance

Anota aquí cada cambio hecho a números del juego, con fecha, antes y después.

| Fecha | Cambio | Antes | Después | Motivo |
|---|---|---|---|---|
| | (ninguno todavía) | | | |

## Siguientes pasos sugeridos

1. Decidir los números de los nerfs y buffs de arriba y registrarlos en la tabla.
2. Medir Ion Cannon, Scavenger y Hunter con simulación antes de cambiarlos: el análisis estático no ve perforación, alcance real ni el arco del Hunter.
3. Extraer el motor de combate de `GameCanvas.tsx` a un módulo sin React para poder simular oleadas con una colocación fija (bot) y comparar torres. Es un refactor grande y mejor en su propio PR.
4. Revisar el pico de la oleada 5 y la economía de las oleadas 12 a 30.

---

# Informe generado (`npm run balance`)

Medium, sin Endless. Commit base `c8c39d5`.

### Torres (nominal, un objetivo)
| Torre | Coste | DPS L1 | DPS L7 | Invertido L7 | DPS/1000$ L1 | DPS/1000$ L7 | Alcance L1 | Alcance L7 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Scavenger (SURVIVOR) | 100 | 60.0 | 361.5 | 880 | 600.0 | 410.8 | 150 | 262 |
| Ranger (SNIPER) | 450 | 51.4 | 327.9 | 3960 | 114.3 | 82.8 | 330 | 581 |
| Incinerator (FLAMETHROWER) | 700 | 180.0 | 2610.0 | 6160 | 257.1 | 423.7 | 150 | 150 |
| Tesla Coil (TESLA) | 1400 | 48.0 | 304.8 | 12320 | 34.3 | 24.7 | 170 | 298 |
| Sentry (TURRET) | 300 | 180.0 | 1042.5 | 2640 | 600.0 | 394.9 | 140 | 245 |
| Ion Cannon (LASER) | 1300 | 50.0 | 317.4 | 11440 | 38.5 | 27.7 | 250 | 441 |
| Hunter (MONK) | 1000 | 180.0 | 1140.0 | 8800 | 180.0 | 129.5 | 3000 | 5314 |
| Chemist (CHEMIST) | 550 | 18.8 | 108.0 | 4840 | 34.1 | 22.3 | 220 | 388 |
| Command Link (RADAR) | 1100 | 0.0 | 0.0 | 9680 | 0.0 | 0.0 | 140 | 245 |
| Earthshaker (MORTAR) | 850 | 50.0 | 318.3 | 7480 | 58.8 | 42.6 | 280 | 492 |
| Pulverizer (SHOCKWAVE) | 650 | 30.0 | 656.7 | 5720 | 46.2 | 114.8 | 110 | 110 |

Mediana DPS/1000$ (sin Radar): L1 = 86.6, L7 = 98.8.

Relativo a la mediana (1.00 = media):
| Torre | L1 | L7 |
|---|---:|---:|
| Scavenger | 6.93 | 4.16 |
| Ranger | 1.32 | 0.84 |
| Incinerator | 2.97 | 4.29 |
| Tesla Coil | 0.40 | 0.25 |
| Sentry | 6.93 | 4.00 |
| Ion Cannon | 0.44 | 0.28 |
| Hunter | 2.08 | 1.31 |
| Chemist | 0.39 | 0.23 |
| Earthshaker | 0.68 | 0.43 |
| Pulverizer | 0.53 | 1.16 |

Salvedades del DPS nominal:
- Incinerator: cooldown es la cadencia durante la ráfaga; el tiempo real de ráfaga no está en config. Además hace daño de quemadura y área.
- Earthshaker: daño de área: el DPS nominal es por objetivo, puede golpear a varios.
- Ion Cannon: el rayo perfora: daña a todos los enemigos en la línea.
- Tesla Coil: cadena eléctrica: daña a varios objetivos.
- Hunter: una flecha teledirigida a la vez; el cooldown solo aplica si se pierde la flecha. Alcance global.
- Pulverizer: su valor principal es el aturdimiento/ralentización, no el daño.
- Command Link: torre de apoyo sin daño propio.
- Chemist: además del impacto aplica veneno/daño en el tiempo.

### Enemigos (Medium, sin Endless)
| Enemigo | Vel. | Daño a vidas | HP o1 | HP o5 | HP o10 | HP o15 | HP o20 | HP o30 | Recompensa o10 | HP/recompensa o10 | Unidades (con spawns) | Vida total con spawns o10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| WALKER | 0.9 | 2 | 102 | 180 | 388 | 682 | 1047 | 1961 | 6 | 64.7 | 1 | 388 |
| RUNNER | 1.1 | 4 | 65 | 115 | 247 | 434 | 667 | 1250 | 10 | 24.7 | 1 | 247 |
| TANK | 0.75 | 10 | 319 | 563 | 1213 | 2132 | 3274 | 6133 | 25 | 48.5 | 4 | 2377 |
| BOSS | 0.5 | 30 | 870 | 1536 | 3309 | 5815 | 8930 | 16725 | 125 | 26.5 | 13 | 10440 |
| MATRYOSHKA | 0.4 | 50 | 2900 | 5121 | 11028 | 19382 | 29767 | 55751 | 626 | 17.6 | 40 | 42348 |
| HEALER | 0.8 | 15 | 1450 | 2560 | 5514 | 9691 | 14884 | 27876 | 13 | 424.2 | 1 | 5514 |
| ICE_MAGE | 0.7 | 5 | 250 | 441 | 951 | 1671 | 2566 | 4806 | 38 | 25.0 | 1 | 951 |
| NINJA | 2 | 2 | 450 | 795 | 1711 | 3008 | 4619 | 8651 | 50 | 34.2 | 1 | 1711 |

### Tiempo para recorrer cada mapa (segundos)
| Mapa | Longitud px | WALKER | RUNNER | NINJA | BOSS |
|---|---:|---:|---:|---:|---:|
| City Ruins (EASY) | 1340 | 24.8 | 20.3 | 11.2 | 44.7 |
| Toxic Wasteland (MEDIUM) | 1880 | 34.8 | 28.5 | 15.7 | 62.7 |
| Bunker Entrance (HARD) | 1520 | 28.1 | 23.0 | 12.7 | 50.7 |
| Sector 7 (MEDIUM) | 2060 | 38.1 | 31.2 | 17.2 | 68.7 |
| The Canyon (HARD) | 1799 | 33.3 | 27.3 | 15.0 | 60.0 |
| Reactor Core (EXTREME) | 4231 | 78.3 | 64.1 | 35.3 | 141.0 |
| Broken Highway (MEDIUM) | 1160 | 21.5 | 17.6 | 9.7 | 38.7 |

### Torres necesarias para matar a UN enemigo en un solo paso (cota superior, un objetivo)
Torres = vida / daño en un paso (cuerda de 2*alcance a la velocidad del enemigo). Menos de 1 = una sola torre basta.
| Enemigo y oleada | Scavenger | Ranger | Incinerator | Tesla Coil | Sentry | Ion Cannon | Hunter | Chemist | Earthshaker | Pulverizer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| TANK o10 (HP 1213) | 3.0 / 0.3 | 1.6 / 0.1 | 1.0 / 0.1 | 3.3 / 0.3 | 1.1 / 0.1 | 2.2 / 0.2 | global / global | 6.6 / 0.7 | 1.9 / 0.2 | 8.3 / 0.4 |
| BOSS o10 (HP 3309) | 5.5 / 0.5 | 2.9 / 0.3 | 1.8 / 0.1 | 6.1 / 0.5 | 2.0 / 0.2 | 4.0 / 0.4 | global / global | 12.0 / 1.2 | 3.5 / 0.3 | 15.0 / 0.7 |
| BOSS o20 (HP 8930) | 14.9 / 1.4 | 7.9 / 0.7 | 5.0 / 0.3 | 16.4 / 1.5 | 5.3 / 0.5 | 10.7 / 1.0 | global / global | 32.5 / 3.2 | 9.6 / 0.9 | 40.6 / 1.9 |
| MATRYOSHKA o20 (HP 29767) | 39.7 / 3.8 | 21.0 / 1.9 | 13.2 / 0.9 | 43.8 / 3.9 | 14.2 / 1.4 | 28.6 / 2.6 | global / global | 86.6 / 8.5 | 25.5 / 2.3 | 108.2 / 4.9 |
| HEALER o20 (HP 14884) | 39.7 / 3.8 | 21.0 / 1.9 | 13.2 / 0.9 | 43.8 / 3.9 | 14.2 / 1.4 | 28.6 / 2.6 | global / global | 86.6 / 8.5 | 25.5 / 2.3 | 108.2 / 4.9 |
(formato: L1 / L7)

### Oleadas y economía (Medium)
Cota inferior = sin Ninja/Ice Mage aleatorios, superior = con ellos siempre.
| Oleada | Unidades | Vida total (inf) | Vida total (sup) | Ingreso (kills+oleada) | Vida/$ | Dinero acumulado al empezar |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 8 | 816 | 816 | 223 | 3.7 | 450 |
| 2 | 10 | 1100 | 1100 | 260 | 4.2 | 673 |
| 3 | 12 | 1536 | 1536 | 297 | 5.2 | 933 |
| 4 | 14 | 1784 | 1784 | 352 | 5.1 | 1230 |
| 5 | 21 | 8075 | 8075 | 497 | 16.2 | 1582 |
| 6 | 21 | 3792 | 3792 | 462 | 8.2 | 2079 |
| 7 | 32 | 8192 | 8192 | 593 | 13.8 | 2541 |
| 8 | 36 | 10524 | 10524 | 652 | 16.1 | 3134 |
| 9 | 43 | 15141 | 16636 | 742 | 20.4 | 3786 |
| 10 | 14 | 12151 | 12151 | 704 | 17.3 | 4528 |
| 11 | 50 | 22267 | 24210 | 951 | 23.4 | 5232 |
| 12 | 58 | 29752 | 31941 | 1056 | 28.2 | 6183 |
| 15 | 30 | 43382 | 43382 | 1330 | 32.6 | 9525 |
| 18 | 87 | 80343 | 90849 | 1571 | 51.1 | 13667 |
| 20 | 40 | 114292 | 114292 | 2297 | 49.8 | 16864 |
| 25 | 88 | 370542 | 370542 | 3625 | 102.2 | 26787 |
| 30 | 103 | 558773 | 558773 | 4217 | 132.5 | 39554 |

## Nerf del Incinerator (PR fix/nerf-incinerator)

Problema: cada llama tenía `pierce: 99` y golpeaba a TODOS los enemigos de su trayectoria, además de subir x1.52 de daño por nivel. Con 10 Matrioskas juntas el daño se multiplicaba por 10 y una sola torre las limpiaba en pocos segundos.

Cambios (constantes en `config/balance.ts`):
- `FLAME_MAX_TARGETS = 3`: una llama golpea como máximo a 3 enemigos (antes 99).
- Mejora de daño por nivel: +5% y x1.25 (antes x1.45). El Pulverizer conserva x1.45.
- Cooldown por nivel x0.95 (antes x0.9), mínimo 2.
- La ráfaga (10 llamas + 30 frames de pausa) pasa a constantes (`FLAME_BURST_SHOTS`, `FLAME_BURST_PAUSE_FRAMES`) sin cambiar su valor.

DPS real contra un objetivo (con la pausa entre ráfagas) y tiempo en limpiar 10 Matrioskas (2900 de vida cada una, Medium, oleada 1):
| Nivel | Antes: daño / DPS / 10 Matrioskas | Ahora: daño / DPS / 10 Matrioskas |
|---|---|---|
| 1 | 9 / 90 / 32 s | 9 / 90 / 107 s |
| 4 | 26 / 301 / 9.6 s | 16 / 172 / 56 s |
| 7 | 87 / 1044 / 2.8 s | 33 / 380 / 25 s |

El nivel 1 no cambia contra un objetivo, pero ya no escala con la multitud. Cumple OBJ-1 y OBJ-3 para esta torre (tests nuevos). Todo es ajustable con las constantes.

## Más dificultad y torres más parejas (PR fix/mas-dificultad)

Motivo (nota del usuario): muy fácil al principio; 2 o 3 torres bien puestas y mejoradas aguantan toda la partida, y se acumulan 7000-8000$. Scavenger (100) es demasiado fuerte por sus mejoras baratas; Ion Cannon (1300) no compensa.

Cambios:

| Qué | Antes | Ahora |
|---|---|---|
| Coste de mejora | 60% + 20%/nivel del coste de la torre | igual, pero sobre `300 + 50% del coste`. Scavenger 1 a 7: 780 a 2730$. Ion Cannon: 10140 a 7410$ |
| Daño por mejora Scavenger y Sentry | x1.3 | x1.2 |
| Daño por mejora Ion Cannon / Tesla / Chemist | x1.3 | x1.4 / x1.35 / x1.4 |
| Ion Cannon daño base | 175 | 300 |
| Tesla daño base | 80 | 120 |
| Chemist daño de impacto | 25 | 40 |
| Sentry | 300$, 24 daño | 350$, 20 daño |
| Dinero inicial | 450 | 400 |
| Vida por oleada | 1 + (n-1)^1.6 / 12 | / 9 |
| Oleadas 1 a 3 | 6+2n Walkers | 8+3n Walkers |
| Desde la 4 | 2n Walkers, 1.5n Runners, Tank desde la 7 (n/3) | 3n Walkers, 2n Runners, Tank desde la 6 (n/2.5) |
| Bonus de oleada | 150+25n (hasta 10), luego 500+30(n-10) | 100+20n, luego 400+25(n-10) |

Efecto (MEDIUM, estático): vida total oleada 1: 816 a 1122; oleada 3: 1533 a 2318; oleada 8: 8768 a 15557; oleada 20: 29767 a 38723. Bonus de oleadas 1-20: 9525 a 7475$.
DPS por 1000$ invertidos en nivel 7 (Scavenger / Sentry / Ion Cannon): 411 / 395 / 28 a 81 / 129 / 99. OBJ-1 y OBJ-4 pasan ahora.

No medido: partida completa en móvil con varias estrategias. Solo hay una prueba corta de bot (Scavenger solo, 95 s) que ya pierde vidas en la oleada 2-3. Valores a ajustar tras jugarlo.
