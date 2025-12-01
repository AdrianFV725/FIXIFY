// ========================================
// FIREBASE CONFIGURATION
// Configuracion e inicializacion de Firebase
// ========================================

const FirebaseConfig = {
    apiKey: "AIzaSyB7GmP3AHs96sWgVOcmwOUgngZtA2_RkAU",
    authDomain: "fixify-38b07.firebaseapp.com",
    databaseURL: "https://fixify-38b07-default-rtdb.firebaseio.com",
    projectId: "fixify-38b07",
    storageBucket: "fixify-38b07.firebasestorage.app",
    messagingSenderId: "571896606262",
    appId: "1:571896606262:web:1168446346e5a8f1edf297",
    measurementId: "G-TKX60C42DG"
};

// Variables globales de Firebase
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

// ========================================
// INICIALIZACION
// ========================================

function initFirebase() {
    try {
        // Verificar que Firebase SDK este cargado
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK no cargado');
            return false;
        }

        // Inicializar app si no existe
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(FirebaseConfig);
        } else {
            firebaseApp = firebase.app();
        }

        // Inicializar servicios
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();

        // Configurar persistencia offline
        firebaseDb.enablePersistence({ synchronizeTabs: true })
            .catch((err) => {
                if (err.code === 'failed-precondition') {
                    console.warn('Persistencia offline no disponible (multiples tabs)');
                } else if (err.code === 'unimplemented') {
                    console.warn('Persistencia offline no soportada');
                }
            });

        console.log('Firebase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('Error al inicializar Firebase:', error);
        return false;
    }
}

// ========================================
// GETTERS
// ========================================

function getFirebaseApp() {
    return firebaseApp;
}

function getFirebaseAuth() {
    return firebaseAuth;
}

function getFirebaseDb() {
    return firebaseDb;
}

// Exportar globalmente
window.FirebaseConfig = FirebaseConfig;
window.initFirebase = initFirebase;
window.getFirebaseApp = getFirebaseApp;
window.getFirebaseAuth = getFirebaseAuth;
window.getFirebaseDb = getFirebaseDb;

