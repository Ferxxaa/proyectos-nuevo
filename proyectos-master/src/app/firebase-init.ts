import * as firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAoXjfpzlCnxf5OyFXf2xQjUOkYeDphO8Q",
  authDomain: "nbi-proyectos.firebaseapp.com",
  projectId: "nbi-proyectos",
  storageBucket: "nbi-proyectos.firebasestorage.app",
  messagingSenderId: "1069264304816",
  appId: "1:1069264304816:web:008ea41769195b33231975"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const firestoreDB = firebase.firestore();
export const storageRef = firebase.storage();