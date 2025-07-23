// Database de temas e perguntas
const themes = [
    {
        id: 'music',
        name: 'Música',
        description: 'Teste seus conhecimentos sobre artistas e álbuns famosos',
        image: 'https://images.pexels.com/photos/167462/pexels-photo-167462.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
        id: 'movies',
        name: 'Cinema',
        description: 'Filmes clássicos e blockbusters modernos',
        image: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
        id: 'history',
        name: 'História',
        description: 'Eventos e personalidades que marcaram o mundo',
        image: 'https://images.pexels.com/photos/12935073/pexels-photo-12935073.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
        id: 'science',
        name: 'Ciência',
        description: 'Descobertas e conceitos científicos',
        image: 'https://images.pexels.com/photos/2280549/pexels-photo-2280549.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
        id: 'sports',
        name: 'Esportes',
        description: 'Atletas, recordes e competições',
        image: 'https://images.pexels.com/photos/163454/soccer-ball-football-soccer-sport-163454.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
        id: 'geography',
        name: 'Geografia',
        description: 'Países, capitais e curiosidades mundiais',
        image: 'https://images.pexels.com/photos/335393/pexels-photo-335393.jpeg?auto=compress&cs=tinysrgb&w=800'
    }
];

const questions = [
    // Música
    {
        id: 1,
        theme: 'music',
        question: "Qual o nome do álbum mais vendido de Michael Jackson?",
        options: ["Bad", "Thriller", "Dangerous", "Off the Wall"],
        correctAnswer: 1,
        explanation: '"Thriller" (1982) é o álbum mais vendido da história, com sucessos como "Billie Jean" e "Beat It", consolidando Michael Jackson como o Rei do Pop.'
    },
    {
        id: 2,
        theme: 'music',
        question: "Qual banda britânica é conhecida pela música 'Bohemian Rhapsody'?",
        options: ["The Beatles", "Led Zeppelin", "Queen", "The Rolling Stones"],
        correctAnswer: 2,
        explanation: '"Bohemian Rhapsody" foi lançada pelo Queen em 1975, composta por Freddie Mercury. É considerada uma das maiores canções de rock de todos os tempos.'
    },
    {
        id: 3,
        theme: 'music',
        question: "Quantas cordas tem um violão tradicional?",
        options: ["4", "5", "6", "7"],
        correctAnswer: 2,
        explanation: 'O violão tradicional possui 6 cordas, afinadas tradicionalmente como Mi, Lá, Ré, Sol, Si, Mi (da mais grave para a mais aguda).'
    },
    {
        id: 4,
        theme: 'music',
        question: "Qual instrumento é conhecido como 'rei dos instrumentos'?",
        options: ["Piano", "Violino", "Órgão", "Guitarra"],
        correctAnswer: 2,
        explanation: 'O órgão é tradicionalmente chamado de "rei dos instrumentos" devido à sua complexidade, versatilidade e presença majestosa em catedrais e igrejas.'
    },
    {
        id: 5,
        theme: 'music',
        question: "Em que década surgiu o rock and roll?",
        options: ["1940", "1950", "1960", "1970"],
        correctAnswer: 1,
        explanation: 'O rock and roll surgiu nos anos 1950 nos Estados Unidos, com artistas como Chuck Berry, Little Richard e Elvis Presley popularizando o gênero.'
    },

    // Cinema
    {
        id: 6,
        theme: 'movies',
        question: "Qual filme ganhou o Oscar de Melhor Filme em 2020?",
        options: ["Parasita", "1917", "Coringa", "Era Uma Vez em Hollywood"],
        correctAnswer: 0,
        explanation: '"Parasita" (2019) do diretor Bong Joon-ho foi o grande vencedor, sendo o primeiro filme em língua não-inglesa a ganhar o Oscar de Melhor Filme.'
    },
    {
        id: 7,
        theme: 'movies',
        question: "Quem dirigiu o filme 'E.T. - O Extraterrestre'?",
        options: ["George Lucas", "Steven Spielberg", "Ridley Scott", "James Cameron"],
        correctAnswer: 1,
        explanation: 'Steven Spielberg dirigiu "E.T. - O Extraterrestre" (1982), que se tornou um dos filmes mais queridos e bem-sucedidos da história do cinema.'
    },
    {
        id: 8,
        theme: 'movies',
        question: "Qual ator interpretou o Coringa no filme 'Batman' de 1989?",
        options: ["Heath Ledger", "Joaquin Phoenix", "Jack Nicholson", "Jared Leto"],
        correctAnswer: 2,
        explanation: 'Jack Nicholson interpretou o Coringa no filme "Batman" (1989) dirigido por Tim Burton, uma performance icônica que definiu o personagem no cinema.'
    },
    {
        id: 9,
        theme: 'movies',
        question: "Quantos filmes compõem a saga original Star Wars?",
        options: ["3", "6", "9", "12"],
        correctAnswer: 0,
        explanation: 'A saga original Star Wars consiste em 3 filmes: "Uma Nova Esperança" (1977), "O Império Contra-Ataca" (1980) e "O Retorno de Jedi" (1983).'
    },
    {
        id: 10,
        theme: 'movies',
        question: "Qual filme tem a famosa frase 'Que a Força esteja com você'?",
        options: ["Star Trek", "Star Wars", "Guardiões da Galáxia", "Blade Runner"],
        correctAnswer: 1,
        explanation: '"Que a Força esteja com você" é a frase icônica da saga Star Wars, usada pelos Jedi e se tornando parte da cultura popular mundial.'
    },

    // História
    {
        id: 11,
        theme: 'history',
        question: "Em que ano aconteceu a Proclamação da República no Brasil?",
        options: ["1888", "1889", "1890", "1891"],
        correctAnswer: 1,
        explanation: 'A Proclamação da República no Brasil aconteceu em 15 de novembro de 1889, liderada pelo Marechal Deodoro da Fonseca.'
    },
    {
        id: 12,
        theme: 'history',
        question: "Quem foi o primeiro presidente dos Estados Unidos?",
        options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"],
        correctAnswer: 2,
        explanation: 'George Washington foi o primeiro presidente dos Estados Unidos, servindo de 1789 a 1797 e estabelecendo muitos precedentes para a presidência.'
    },
    {
        id: 13,
        theme: 'history',
        question: "Em que ano caiu o Muro de Berlim?",
        options: ["1987", "1988", "1989", "1990"],
        correctAnswer: 2,
        explanation: 'O Muro de Berlim caiu em 9 de novembro de 1989, simbolizando o fim da Guerra Fria e a reunificação da Alemanha.'
    },
    {
        id: 14,
        theme: 'history',
        question: "Qual civilização construiu Machu Picchu?",
        options: ["Asteca", "Maia", "Inca", "Olmeca"],
        correctAnswer: 2,
        explanation: 'Machu Picchu foi construída pela civilização Inca no século XV, no Peru. É considerada uma das Sete Maravilhas do Mundo Moderno.'
    },
    {
        id: 15,
        theme: 'history',
        question: "Em que ano começou a Segunda Guerra Mundial?",
        options: ["1938", "1939", "1940", "1941"],
        correctAnswer: 1,
        explanation: 'A Segunda Guerra Mundial começou em 1º de setembro de 1939, quando a Alemanha nazista invadiu a Polônia.'
    },

    // Ciência
    {
        id: 16,
        theme: 'science',
        question: "Qual é o elemento químico mais abundante no universo?",
        options: ["Oxigênio", "Carbono", "Hidrogênio", "Hélio"],
        correctAnswer: 2,
        explanation: 'O hidrogênio é o elemento mais abundante no universo, constituindo cerca de 75% de toda a matéria normal observável.'
    },
    {
        id: 17,
        theme: 'science',
        question: "Quantos ossos tem o corpo humano adulto?",
        options: ["186", "206", "226", "246"],
        correctAnswer: 1,
        explanation: 'O corpo humano adulto possui 206 ossos. Este número é menor que o de bebês, que nascem com cerca de 270 ossos que se fundem durante o crescimento.'
    },
    {
        id: 18,
        theme: 'science',
        question: "Qual planeta é conhecido como 'Planeta Vermelho'?",
        options: ["Vênus", "Marte", "Júpiter", "Saturno"],
        correctAnswer: 1,
        explanation: 'Marte é conhecido como "Planeta Vermelho" devido à presença de óxido de ferro (ferrugem) em sua superfície, que lhe dá a cor característica.'
    },
    {
        id: 19,
        theme: 'science',
        question: "Qual é a velocidade da luz no vácuo?",
        options: ["299.792.458 m/s", "300.000.000 m/s", "298.000.000 m/s", "301.000.000 m/s"],
        correctAnswer: 0,
        explanation: 'A velocidade da luz no vácuo é exatamente 299.792.458 metros por segundo, uma constante fundamental da física.'
    },
    {
        id: 20,
        theme: 'science',
        question: "Quem desenvolveu a teoria da relatividade?",
        options: ["Isaac Newton", "Galileu Galilei", "Albert Einstein", "Stephen Hawking"],
        correctAnswer: 2,
        explanation: 'Albert Einstein desenvolveu a teoria da relatividade, tanto a especial (1905) quanto a geral (1915), revolucionando nossa compreensão do espaço e tempo.'
    },

    // Esportes
    {
        id: 21,
        theme: 'sports',
        question: "Em que esporte Pelé se tornou famoso?",
        options: ["Basquete", "Vôlei", "Futebol", "Tênis"],
        correctAnswer: 2,
        explanation: 'Pelé se tornou famoso no futebol, sendo considerado por muitos o maior jogador de todos os tempos, com três Copas do Mundo conquistadas.'
    },
    {
        id: 22,
        theme: 'sports',
        question: "Quantos jogadores compõem um time de basquete em quadra?",
        options: ["4", "5", "6", "7"],
        correctAnswer: 1,
        explanation: 'Um time de basquete tem 5 jogadores em quadra: um armador, dois alas e dois pivôs (ou variações dessas posições).'
    },
    {
        id: 23,
        theme: 'sports',
        question: "Em que cidade aconteceram os primeiros Jogos Olímpicos da era moderna?",
        options: ["Paris", "Londres", "Atenas", "Roma"],
        correctAnswer: 2,
        explanation: 'Os primeiros Jogos Olímpicos da era moderna aconteceram em Atenas, Grécia, em 1896, organizados pelo Barão Pierre de Coubertin.'
    },
    {
        id: 24,
        theme: 'sports',
        question: "Qual é o recorde mundial dos 100m rasos masculino?",
        options: ["9,58s", "9,63s", "9,69s", "9,72s"],
        correctAnswer: 0,
        explanation: 'O recorde mundial dos 100m rasos masculino é de 9,58 segundos, estabelecido por Usain Bolt no Mundial de Berlim em 2009.'
    },
    {
        id: 25,
        theme: 'sports',
        question: "Quantas vezes o Brasil ganhou a Copa do Mundo de Futebol?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 2,
        explanation: 'O Brasil ganhou a Copa do Mundo 5 vezes: 1958, 1962, 1970, 1994 e 2002, sendo o país com mais títulos mundiais.'
    },

    // Geografia
    {
        id: 26,
        theme: 'geography',
        question: "Qual é a capital da Austrália?",
        options: ["Sydney", "Melbourne", "Canberra", "Perth"],
        correctAnswer: 2,
        explanation: 'Canberra é a capital da Austrália desde 1913. A cidade foi planejada especificamente para ser a capital, localizada entre Sydney e Melbourne.'
    },
    {
        id: 27,
        theme: 'geography',
        question: "Qual é o maior deserto do mundo?",
        options: ["Saara", "Gobi", "Antártica", "Kalahari"],
        correctAnswer: 2,
        explanation: 'A Antártica é tecnicamente o maior deserto do mundo, sendo um deserto polar com cerca de 14 milhões de km². O Saara é o maior deserto quente.'
    },
    {
        id: 28,
        theme: 'geography',
        question: "Qual rio é considerado o mais longo do mundo?",
        options: ["Amazônas", "Nilo", "Yangtzé", "Mississippi"],
        correctAnswer: 1,
        explanation: 'O Rio Nilo, com aproximadamente 6.650 km, é tradicionalmente considerado o rio mais longo do mundo, fluindo pelo nordeste da África.'
    },
    {
        id: 29,
        theme: 'geography',
        question: "Em que continente está localizado o Egito?",
        options: ["Ásia", "África", "Europa", "América"],
        correctAnswer: 1,
        explanation: 'O Egito está localizado no continente africano, no nordeste da África, fazendo fronteira com o Mar Mediterrâneo ao norte.'
    },
    {
        id: 30,
        theme: 'geography',
        question: "Qual é a montanha mais alta do mundo?",
        options: ["K2", "Monte Everest", "Kangchenjunga", "Lhotse"],
        correctAnswer: 1,
        explanation: 'O Monte Everest, com 8.848,86 metros de altitude, é a montanha mais alta do mundo, localizada na cordilheira do Himalaia.'
    }
];

// Função para obter perguntas por tema
function getQuestionsByTheme(themeId, count = 10) {
    const themeQuestions = questions.filter(q => q.theme === themeId);
    
    // Embaralha as perguntas
    const shuffled = [...themeQuestions].sort(() => Math.random() - 0.5);
    
    // Retorna o número solicitado de perguntas
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Função para obter todas as perguntas misturadas
function getMixedQuestions(count = 20) {
    // Embaralha todas as perguntas
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    
    // Retorna o número solicitado de perguntas
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Função para obter tema por ID
function getThemeById(themeId) {
    return themes.find(theme => theme.id === themeId);
}

// Exporta para uso global
window.gameDatabase = {
    themes,
    questions,
    getQuestionsByTheme,
    getMixedQuestions,
    getThemeById
};