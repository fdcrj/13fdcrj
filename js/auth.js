import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

let currentUser = null;
let resolveAuthReady;
const authReady = new Promise(resolve => { resolveAuthReady = resolve; });

const $ = selector => document.querySelector(selector);

function setAuthMessage(message, isError = false) {
  const status = $('#authStatus');
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('auth-error', isError);
}

function renderAuth(user) {
  currentUser = user || null;
  const signIn = $('#googleSignIn');
  const signOutButton = $('#googleSignOut');
  const userBox = $('#authUser');
  const avatar = $('#authAvatar');
  const name = $('#authName');

  if (signIn) signIn.hidden = Boolean(user);
  if (signOutButton) signOutButton.hidden = !user;
  if (userBox) userBox.hidden = !user;
  if (avatar) {
    avatar.src = user?.photoURL || '';
    avatar.alt = user ? `Foto de ${user.displayName || 'usuário Google'}` : '';
    avatar.hidden = !user?.photoURL;
  }
  if (name) name.textContent = user?.displayName || user?.email || '';
  if (user) setAuthMessage('Conta Google conectada');
  else setAuthMessage('Entre para salvar sua experiência');
  document.documentElement.classList.toggle('is-authenticated', Boolean(user));
  window.dispatchEvent(new CustomEvent('fdcrj-auth-change', { detail: { user } }));
}

async function loginWithGoogle() {
  const button = $('#googleSignIn');
  if (button) { button.disabled = true; button.textContent = 'Entrando...'; }
  setAuthMessage('Abrindo a conta Google...');
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Falha no login Google:', error);
    const message = error?.code === 'auth/popup-blocked'
      ? 'O navegador bloqueou a janela. Permita pop-ups para entrar.'
      : error?.code === 'auth/unauthorized-domain'
        ? 'Este domínio ainda não foi autorizado no Firebase.'
        : 'Não foi possível concluir o login Google.';
    setAuthMessage(message, true);
  } finally {
    if (button) { button.disabled = false; button.textContent = 'Continuar com Google'; }
  }
}

async function logout() {
  try {
    await signOut(auth);
    setAuthMessage('Você saiu da conta Google');
  } catch (error) {
    console.error('Falha ao sair:', error);
    setAuthMessage('Não foi possível sair agora.', true);
  }
}

async function getSharedRating(slug) {
  const snapshot = await getDocs(collection(db, 'beerRatings', slug, 'votes'));
  const ratings = snapshot.docs.map(item => Number(item.data()?.rating)).filter(value => Number.isInteger(value) && value >= 1 && value <= 5);
  const userRating = currentUser ? Number(snapshot.docs.find(item => item.id === currentUser.uid)?.data()?.rating || 0) : 0;
  return { average: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 0, count: ratings.length, userRating };
}

async function saveSharedRating(slug, rating) {
  const user = currentUser || await authReady;
  if (!user) throw new Error('AUTH_REQUIRED');
  const value = Number(rating);
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new Error('INVALID_RATING');
  await setDoc(doc(db, 'beerRatings', slug, 'votes', user.uid), { rating: value });
  return getSharedRating(slug);
}

async function removeSharedRating(slug) {
  const user = currentUser || await authReady;
  if (!user) throw new Error('AUTH_REQUIRED');
  await deleteDoc(doc(db, 'beerRatings', slug, 'votes', user.uid));
  return getSharedRating(slug);
}

$('#googleSignIn')?.addEventListener('click', loginWithGoogle);
$('#googleSignOut')?.addEventListener('click', logout);
onAuthStateChanged(auth, user => {
  renderAuth(user);
  resolveAuthReady(user || null);
  window.dispatchEvent(new CustomEvent('fdcrj-auth-ready', { detail: { user } }));
});

window.FDCRJ_AUTH = {
  app,
  auth,
  ready: authReady,
  getUser: () => currentUser,
  loginWithGoogle,
  logout,
  getSharedRating,
  saveSharedRating,
  removeSharedRating
};
