import axios from 'axios';

const evolutionUrl = import.meta.env.VITE_EVOLUTION_DEFAULT_URL;

export const evolutionClient = axios.create({
  baseURL: evolutionUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});
