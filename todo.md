# Nico Rewards - Todo List

## Completed Tasks

- [x] Analyze current authentication setup and error logs
- [x] Check Shopify app configuration and scopes
- [x] Review ngrok setup and CORS/authentication issues
- [x] Buscar referencias a sf_private_access_tokens en el c�digo
- [x] Corregir URLs en el widget JavaScript
- [x] Verificar configuraci�n del App Proxy
- [x] Probar la soluci�n completa
- [x] Agregar resumen de cambios a todo.md

## Review

### Cambios realizados para solucionar el error de autenticaci�n 401:

1. **Widget JavaScript actualizado** (`extensions/nico-rewards-widget/assets/nico-rewards.js`):
   - Agregado el par�metro `apiUrl: '/apps/proxy'` en la inicializaci�n del widget
   - Esto asegura que las llamadas API usen el App Proxy correcto

2. **Configuraci�n del App Proxy corregida** (`shopify.app.toml`):
   - Cambiado de `url = "https://d32d84706654.ngrok-free.app/apps.proxy.customer"` 
   - A `url = "https://d32d84706654.ngrok-free.app"`
   - El App Proxy debe apuntar a la URL base de la aplicaci�n

3. **Creada ruta base del App Proxy** (`app/routes/apps.proxy.tsx`):
   - Agregada para manejar la ruta ra�z del proxy
   - Las rutas espec�ficas siguen siendo manejadas por sus archivos individuales

### Causa del problema:
El error ocurr�a porque el frontend intentaba acceder a `/sf_private_access_tokens` (un endpoint inexistente) en lugar de usar el App Proxy configurado en `/apps/proxy`. La soluci�n fue asegurar que el widget use las URLs correctas del App Proxy.

### Nota sobre ngrok:
No es necesario cambiar de ngrok a Vercel/Netlify. El problema no era con ngrok sino con la configuraci�n de autenticaci�n. Ngrok funciona perfectamente para desarrollo local de apps de Shopify.

---

## New Issue: Widget Not Loading (2025-07-13)

### Problem
- Widget shows "Unable to load rewards data" error
- Error in console: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- Happens in both incognito and logged-in states
- The `/apps/proxy/customer/summary` endpoint returns HTML instead of JSON

### Tasks
- [x] Check if the app proxy is configured correctly in Shopify Partners
- [x] Verify the proxy URL path matches the route structure
- [x] Add better error handling to detect HTML responses
- [x] Fix the authentication flow for the app proxy
- [x] Add ngrok-skip-browser-warning header to widget requests
- [x] Configure CORS headers in app proxy routes
- [ ] Test in both guest and logged-in states

### Changes Made
1. **Added missing SHOPIFY_API_SECRET** to .env file - This is critical for app proxy authentication
2. **Enhanced error handling in widget** - Now detects HTML responses and logs more details
3. **Added debug logging** to the app proxy route to help diagnose issues
4. **Added ngrok-skip-browser-warning header** - Prevents ngrok from showing warning pages
5. **Configured CORS headers** - Allows cross-origin requests from Shopify storefront
6. **Added OPTIONS handler** - Handles CORS preflight requests

### Final Fix Applied
The root cause was ngrok intercepting requests with its warning page. Added:
- `ngrok-skip-browser-warning: true` header to all widget requests
- Proper CORS configuration to allow requests from Shopify storefront

### Next Steps
1. Test the widget in incognito mode and with logged-in user
2. Remove debug console.log statements once confirmed working