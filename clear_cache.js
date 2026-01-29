// Script para limpar cache e forçar reload completo
// Execute este código no Console do navegador (F12 -> Console)

console.log('🧹 Iniciando limpeza completa...\n');

// 1. Limpar localStorage
localStorage.clear();
console.log('✅ localStorage limpo');

// 2. Limpar sessionStorage  
sessionStorage.clear();
console.log('✅ sessionStorage limpo');

// 3. Desregistrar Service Workers
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
            console.log('✅ Service Worker desregistrado');
        }
    });
}

// 4. Limpar todos os caches
if ('caches' in window) {
    caches.keys().then(function (names) {
        for (let name of names) {
            caches.delete(name);
            console.log('✅ Cache deletado:', name);
        }
    });
}

console.log('\n🔄 Aguarde 2 segundos...');

// 5. Recarregar página após 2 segundos
setTimeout(() => {
    console.log('🚀 Recarregando página...');
    window.location.reload(true);
}, 2000);
