import type { MediaItem, MediaDetails } from '../types/index.js'

const mockMovies: MediaItem[] = [
  {
    id: 'movie-1',
    title: 'Interestelar',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    rating: 8.7,
    year: 2014,
    duration: 169,
    synopsis: 'Un grupo de exploradores hace uso de un agujero de gusano recién descubierto para superar las limitaciones de los viajes espaciales tripulados y conquistar las inmensas distancias involucradas en un viaje interestelar.',
    genres: ['Ciencia Ficción', 'Aventura', 'Drama'],
  },
  {
    id: 'movie-2',
    title: 'El Caballero de la Noche',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    rating: 9.0,
    year: 2008,
    duration: 152,
    synopsis: 'Batman tiene que mantener el equilibrio entre su heroicidad y su uso de la violencia, mientras combate al Joker, un criminal que quiere sumir Ciudad Gótica en la anarquía.',
    genres: ['Acción', 'Crimen', 'Drama'],
  },
  {
    id: 'movie-3',
    title: 'Pulp Fiction',
    poster: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
    rating: 8.9,
    year: 1994,
    duration: 154,
    synopsis: 'La vida de un boxeador, dos sicarios, la esposa de un gánster y dos bandidos se entrelaza en una historia de violencia y redención.',
    genres: ['Crimen', 'Drama'],
  },
  {
    id: 'movie-4',
    title: 'Matrix',
    poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
    rating: 8.7,
    year: 1999,
    duration: 136,
    synopsis: 'Un hacker descubre que el mundo en el que vive es solo una simulación creada por máquinas, y se une a un grupo de rebeldes para combatirlas.',
    genres: ['Ciencia Ficción', 'Acción'],
  },
  {
    id: 'movie-5',
    title: 'El Señor de los Anillos: La Comunidad del Anillo',
    poster: 'https://image.tmdb.org/t/p/w500/6oom5QYQ2yQTMJIbnvbkBLBLcmm.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/wuMc08IPKEatf9rnMNXvIDxqP4W.jpg',
    rating: 8.8,
    year: 2001,
    duration: 178,
    synopsis: 'Un hobbit llamado Frodo se embarca en un viaje épico para destruir un anillo mágico antes de que caiga en manos del Señor Oscuro Sauron.',
    genres: ['Fantasía', 'Aventura', 'Drama'],
  },
  {
    id: 'movie-6',
    title: 'Origen',
    poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    rating: 8.8,
    year: 2010,
    duration: 148,
    synopsis: 'Un ladrón especializado en extraer secretos del subconsciente durante los sueños recibe la tarea de implantar una idea en la mente de un heredero empresarial.',
    genres: ['Ciencia Ficción', 'Acción', 'Suspense'],
  },
  {
    id: 'movie-7',
    title: 'El Padrino',
    poster: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    rating: 9.2,
    year: 1972,
    duration: 175,
    synopsis: 'El patriarca de una familia mafiosa transfiere el control de su imperio a su hijo menor, Michael, quien al principio quería mantenerse alejado del negocio familiar.',
    genres: ['Crimen', 'Drama'],
  },
  {
    id: 'movie-8',
    title: 'Parásitos',
    poster: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    rating: 8.5,
    year: 2019,
    duration: 132,
    synopsis: 'Una familia pobre conspira para conseguir trabajo en la casa de una familia adinerada, infiltrándose en sus vidas de una manera inesperada.',
    genres: ['Drama', 'Comedia', 'Suspense'],
  },
  {
    id: 'movie-9',
    title: 'Coco',
    poster: 'https://image.tmdb.org/t/p/w500/gGEsBPAFhPYjTNUMtDILgfyt4Hq.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/bOGkgRGdhrBYJSLpXaxhXVstddV.jpg',
    rating: 8.4,
    year: 2017,
    duration: 105,
    synopsis: 'Miguel sueña con convertirse en músico, pero su familia lo prohíbe. En el Día de los Muertos, viaja al mundo de los espíritus para descubrir la verdad sobre su historia familiar.',
    genres: ['Animación', 'Fantasía', 'Comedia'],
  },
  {
    id: 'movie-10',
    title: 'Avengers: Endgame',
    poster: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    rating: 8.4,
    year: 2019,
    duration: 181,
    synopsis: 'Después de los eventos devastadores de Infinity War, los Vengadores restantes deben reunirse una vez más para revertir las acciones de Thanos y restaurar el equilibrio del universo.',
    genres: ['Acción', 'Ciencia Ficción', 'Aventura'],
  },
]

const mockSeries: MediaItem[] = [
  {
    id: 'series-1',
    title: 'Breaking Bad',
    poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    rating: 9.5,
    year: 2008,
    duration: 47,
    synopsis: 'Un profesor de química de secundaria con cáncer terminal se asocia con un exestudiante para asegurar el futuro de su familia fabricando y vendiendo metanfetamina.',
    genres: ['Drama', 'Crimen', 'Suspense'],
  },
  {
    id: 'series-2',
    title: 'Game of Thrones',
    poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/suopoADq0k8YZr4dQXcU6pToj6s.jpg',
    rating: 8.4,
    year: 2011,
    duration: 60,
    synopsis: 'Nueve familias nobles luchan por el control del mítico reino de Poniente, mientras un antiguo enemigo regresa después de miles de años.',
    genres: ['Drama', 'Fantasía', 'Acción'],
  },
  {
    id: 'series-3',
    title: 'Stranger Things',
    poster: 'https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    rating: 8.7,
    year: 2016,
    duration: 50,
    synopsis: 'Cuando un niño desaparece, un pequeño pueblo descubre un misterio que involucra experimentos secretos, fuerzas sobrenaturales y una niña extraña.',
    genres: ['Drama', 'Misterio', 'Ciencia Ficción'],
  },
  {
    id: 'series-4',
    title: 'The Mandalorian',
    poster: 'https://image.tmdb.org/t/p/w500/sWgBv7LV2PRoQgkxwlibdGXKz1S.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/9ijMGlJKqcslswWUzTEwScm82Gs.jpg',
    rating: 8.7,
    year: 2019,
    duration: 40,
    synopsis: 'Un cazarrecompensas solitario en una galaxia muy, muy lejana protege a una misteriosa criatura mientras es perseguido por enemigos mortales.',
    genres: ['Ciencia Ficción', 'Acción', 'Aventura'],
  },
  {
    id: 'series-5',
    title: 'The Office',
    poster: 'https://image.tmdb.org/t/p/w500/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/1DiCkF6p3OjZVKs9HnTEUWzTFq6.jpg',
    rating: 8.8,
    year: 2005,
    duration: 22,
    synopsis: 'Un documental que muestra la vida cotidiana de los empleados de la sucursal de Scranton de Dunder Mifflin Paper Company.',
    genres: ['Comedia'],
  },
  {
    id: 'series-6',
    title: 'Dark',
    poster: 'https://image.tmdb.org/t/p/w500/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/75GFqrnPfJaeSJlpvJHVcmwLNNU.jpg',
    rating: 8.8,
    year: 2017,
    duration: 60,
    synopsis: 'La desaparición de niños en una pequeña ciudad alemana revela un misterio que abarca cuatro generaciones y desafía la naturaleza del tiempo.',
    genres: ['Drama', 'Misterio', 'Ciencia Ficción'],
  },
  {
    id: 'series-7',
    title: 'Peaky Blinders',
    poster: 'https://image.tmdb.org/t/p/w500/vUUqzWa2LnHIVqkaKVlVGkVcZIW.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/wiE9doxiLwq3WCGamDIOb2PqBqc.jpg',
    rating: 8.8,
    year: 2013,
    duration: 60,
    synopsis: 'Una banda familiar ambientada en Birmingham, Inglaterra, después de la Primera Guerra Mundial, centrada en la ambiciosa y peligrosa familia Shelby.',
    genres: ['Drama', 'Crimen'],
  },
  {
    id: 'series-8',
    title: 'The Witcher',
    poster: 'https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/jBJWaqoSCiARWtfV0GlqHrcdidd.jpg',
    rating: 8.2,
    year: 2019,
    duration: 60,
    synopsis: 'Geralt de Rivia, un cazador de monstruos mutante, lucha por encontrar su lugar en un mundo donde la gente es más malvada que las bestias.',
    genres: ['Drama', 'Fantasía', 'Acción'],
  },
  {
    id: 'series-9',
    title: 'Money Heist',
    poster: 'https://image.tmdb.org/t/p/w500/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/gFZriCkpJYsApPZEF3jhxL4yLzG.jpg',
    rating: 8.3,
    year: 2017,
    duration: 70,
    synopsis: 'Un grupo de ladrones planea el mayor robo de la historia: imprimir miles de millones de euros en la Fábrica Nacional de Moneda y Timbre de España.',
    genres: ['Drama', 'Crimen', 'Suspense'],
  },
  {
    id: 'series-10',
    title: 'Friends',
    poster: 'https://image.tmdb.org/t/p/w500/f496cm9enuEsZkSPzCwnTESEK5s.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/l0qVZIpXtIo7km9u5Yqh0nKPOr5.jpg',
    rating: 8.8,
    year: 1994,
    duration: 22,
    synopsis: 'Seis amigos en Nueva York navegan por la vida, el amor y las carreras profesionales mientras pasan tiempo juntos en su café favorito.',
    genres: ['Comedia', 'Romance'],
  },
]

export function getMockMediaList(type: string, skip: number, limit: number): MediaItem[] {
  let items: MediaItem[]

  if (type === 'series') {
    items = mockSeries
  } else if (type === 'all') {
    items = [...mockMovies, ...mockSeries]
  } else {
    items = mockMovies
  }

  return items.slice(skip, skip + limit)
}

export function getMockMediaDetails(mediaId: string): MediaDetails | null {
  const allMedia = [...mockMovies, ...mockSeries]
  const item = allMedia.find((m) => m.id === mediaId)

  if (!item) return null

  return {
    ...item,
    cast: [
      { name: 'Actor Principal', role: 'Protagonista' },
      { name: 'Actor Secundario', role: 'Personaje secundario' },
      { name: 'Actriz Principal', role: 'Protagonista femenina' },
    ],
    subtitles: ['Español', 'Inglés', 'Portugués'],
    audio: ['Español', 'Inglés'],
  }
}
