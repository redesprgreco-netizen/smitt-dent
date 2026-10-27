# Smitt-Dent — archivos modificados

Copia estas carpetas sobre la raíz de tu proyecto (sobrescribe los existentes).
Todo lo que NO viene aquí queda igual. No requiere cambios en la base de datos ni nuevas dependencias.

## Modificados (reemplazan al original)
- app/dashboard/page.tsx            Dashboard centrado en las citas de hoy; fecha en zona CDMX; corrige "Citas esta semana"
- app/agenda/page.tsx               Vista Día (por doctora y hora) + vista Mes; navegación por día
- app/expedientes/[id]/page.tsx     Odontograma como pestaña inicial, nuevo orden de pestañas, alertas clínicas fijas
- app/globals.css                   Se AÑADEN estilos al final (lo anterior no cambia)
- components/agenda/AppointmentModal.tsx   Nueva prop opcional defaultHora (agendar desde un hueco)
- components/layout/AppShell.tsx    Se quita el efecto sparkle
- components/layout/Sidebar.tsx     Sin logo duplicado, sin "Usuarios" repetido, sin sparkle
- components/layout/Topbar.tsx      Buscador global, sin campana decorativa, sin sparkle

## Nuevos
- components/ui/PageHeader.tsx      Encabezado de página reutilizable
- components/layout/GlobalSearch.tsx  Buscador global de pacientes (Ctrl+K)
- components/agenda/DayView.tsx     Vista de día por doctora

## Opcional
- components/layout/SparkleEffect.tsx ya no se usa; puedes borrarlo.
