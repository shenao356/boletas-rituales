# ⚡ RITUALES - Gestor de Boletas & Control Económico
### Creado para **Santiago & Sebas** 🎧⚡
Sistema profesional para el control de inventario, registro de ventas, cálculo automático de utilidades 50/50 y seguimiento de clientes para eventos de música electrónica (Rituales Fest, Afterlife, Baum Festival, etc.).

---

## 🌟 Características Principales

1. **📱 Acceso Total desde Celular o Computador**:
   - Diseño responsive con barra de navegación inferior en móviles y vista de escritorio en PC.
   - Funciona como PWA (Progressive Web App): se puede instalar en la pantalla de inicio de iPhone y Android sin necesidad de tiendas de aplicaciones.

2. **📦 Inventario de Boletas & Categorías**:
   - Registro de lotes por evento (Rituales, Baum, Afterlife, etc.) y categoría (VIP, General, Early Bird, Backstage, Palco).
   - Control de precio de compra original, precio de venta sugerido, cantidad adquirida y cálculo automático de boletas restantes.
   - Alertas visuales de stock bajo o agotado.

3. **🎟️ Registro de Ventas & Consecutivos**:
   - Consecutivo automático (#001, #002, etc.).
   - Autocompletado desde inventario disponible.
   - Registro de comprador: Nombre, número de WhatsApp/Teléfono y notas.
   - Comparación inmediata: Precio de compra vs. Precio de venta.
   - Generador de comprobante de venta en 1 clic para enviar por WhatsApp.

4. **💰 Dashboard & División 50/50 para Santiago y Sebas**:
   - Tarjetas destacadas en tiempo real de cuánto le toca de ganancia neta a **Santiago** y a **Sebas**.
   - Gráfico de reparto de utilidades entre los dos socios.
   - Gráfico interactivo de ventas y ganancias por festival.
   - Control de recaudo: dinero efectivamente cobrado vs. saldos pendientes (abonos o fiados).
   - Control de liquidaciones: marcar con un botón si la ganancia de una venta ya fue repartida o está pendiente por cuadrar.

5. **🔍 Filtros Avanzados & Ordenamiento**:
   - Búsqueda en tiempo real por cliente, teléfono, evento o consecutivo.
   - Filtros por estado de pago (Pagado, Pendiente, Abono parcial).
   - Filtros por estado de liquidación a los socios (Liquidado / Pendiente).
   - Filtros por rentabilidad (ganancias positivas o márgenes negativos).
   - Ordenamiento alfabético (A-Z / Z-A), por ganancia mayor/menor, por precio o por fecha.

6. **🎨 Interfaz 100% Personalizable**:
   - Temas visuales con un clic:
     * **Cyber Neon** (Estética Rituales: Violeta neón & Cyan)
     * **Sunset Rave** (Naranja cálido & Rosa Techno)
     * **Emerald Techno** (Verde esmeralda neón)
     * **Dark Obsidian** (Minimalista oscuro)
   - Datos 100% editables: puedes modificar cualquier venta o lote con un clic.
   - Exportación de ventas a **Excel (CSV)** y respaldo completo en **JSON**.

---

## 🚀 Cómo Publicar la Aplicación en GitHub (En 3 Minutos)

Para que tanto Santiago como Sebas puedan abrir la app desde cualquier lugar en su celular o computador a través de un enlace web gratuito de GitHub:

### Paso 1: Crear el repositorio en GitHub
1. Entra a [github.com](https://github.com) e inicia sesión con tu cuenta.
2. Haz clic en el botón verde **"New"** (Nuevo repositorio).
3. Nómbralo por ejemplo: `boletas-rituales`.
4. Elige si quieres que sea **Público** (recomendado para usar GitHub Pages gratis) y haz clic en **"Create repository"**.

### Paso 2: Subir los archivos desde tu computadora
Abre la consola (PowerShell o Git Bash) en esta carpeta y corre los siguientes comandos:

```bash
git add .
git commit -m "Lanzamiento oficial Boletas Rituales para Santiago y Sebas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/boletas-rituales.git
git push -u origin main
```
*(Reemplaza `TU_USUARIO` por tu usuario de GitHub).*

### Paso 3: Activar GitHub Pages (Tu enlace web gratis)
1. En tu repositorio en GitHub, ve a la pestaña **Settings** (Configuración).
2. En el menú lateral izquierdo, haz clic en **Pages**.
3. En la sección **Branch**, cambia `None` por **main** y la carpeta deja `/(root)`.
4. Haz clic en **Save** (Guardar).
5. Espera unos segundos y recarga la página: verás un mensaje verde con tu link:
   👉 **`https://TU_USUARIO.github.io/boletas-rituales/`**

---

## 📲 Cómo Instalarla en el Celular como una App Nativa

### En iPhone (iOS / Safari):
1. Abre el enlace de GitHub Pages en **Safari**.
2. Toca el botón **Compartir** (el icono de cuadro con flecha hacia arriba en la parte inferior).
3. Desliza hacia abajo y selecciona **"Agregar a pantalla de inicio"** (Add to Home Screen).
4. Dale a **Agregar**. ¡Aparecerá en tu pantalla con el logo y funcionará en pantalla completa sin barra de navegador!

### En Android (Google Chrome):
1. Abre el enlace en **Chrome**.
2. Toca los 3 puntos arriba a la derecha.
3. Selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
4. ¡Listo! Se abrirá como una aplicación nativa.

---

## ☁️ Sincronización en Tiempo Real entre Dispositivos (GitHub)

Para que cada venta o lote de inventario que registres en tu celular se actualice automáticamente en el repositorio de GitHub y aparezca en el celular de Sebas y en cualquier computador:

1. **Obtén tu Token de GitHub (Se hace una sola vez en 30 segundos)**:
   - Ingresa a este enlace directo: [github.com/settings/tokens/new?scopes=repo&description=Boletas+Rituales+Sync](https://github.com/settings/tokens/new?scopes=repo&description=Boletas+Rituales+Sync).
   - En **"Note"** pon: `Boletas Rituales`.
   - Asegúrate de marcar la casilla **`repo`** (acceso completo al repositorio).
   - Baja y haz clic en **"Generate token"**.
   - Copia el código generado (empieza por `ghp_...`).
2. **Pega el Token en la App**:
   - En la aplicación, toca la nube en el menú superior o ve a la pestaña **⚙️ Ajustes > Sincronización en Tiempo Real**.
   - Pega tu Token y dale a **"Guardar Token y Conectar"**.
3. **¡Listo!**:
   - Cada vez que registres una venta, edites un precio o agregues inventario, la app hará un commit automático al archivo `data/db.json` en GitHub.
   - Cualquier celular o computador conectado recibirá los cambios automáticamente cada 25 segundos o inmediatamente al presionar el botón **🔄 Sincronizar**.

---

## 💾 Respaldo Manual y Exportación
- **Descargar Copia de Seguridad**: En la pestaña **⚙️ Ajustes**, haz clic en **"Descargar Copia JSON"**. Puedes compartir este archivo por WhatsApp entre Santiago y Sebas.
- **Restaurar Copia**: El otro socio puede presionar **"Restaurar Copia JSON"** y cargar el archivo para tener exactamente los mismos datos actualizados.
- **Exportar a Excel**: En la pestaña **🎟️ Ventas**, haz clic en **"Exportar Excel"** para descargar una hoja de cálculo con todos los números y detalles contables.

---
🎧 *Hecho a la medida para los eventos de música electrónica.* ⚡
