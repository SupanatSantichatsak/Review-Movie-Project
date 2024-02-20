import express from "express";
import bodyParser from "body-parser";
import pg from "pg"
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "https://www.omdbapi.com"
const apikey = "f01dd666"

let defaults = [
  {
    Title: "The Shawshank Redemption",
    Year: "1994",
    imdbID: "tt0111161",
    Type: "movie",
    Poster: "https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViZWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg",
    Plot: "Over the course of several years, two convicts form a friendship, seeking consolation and, eventually, redemption through basic compassion.",
    Director: "Frank Darabont",
    Writer: "Stephen King, Frank Darabont",
    Actors: "Tim Robbins, Morgan Freeman, Bob Gunton",
  },
  {
    Title: "The Godfather",
    Year: "1972",
    imdbID: "tt0068646",
    Type: "movie",
    Poster: "https://m.media-amazon.com/images/M/MV5BM2MyNjYxNmUtYTAwNi00MTYxLWJmNWYtYzZlODY3ZTk3OTFlXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg",
    Plot: "Don Vito Corleone, head of a mafia family, decides to hand over his empire to his youngest son Michael. However, his decision unintentionally puts the lives of his loved ones in grave danger.",
    Director: "Francis Ford Coppola",
    Writer: "Mario Puzo, Francis Ford Coppola",
    Actors: "Marlon Brando, Al Pacino, James Caan",
  },
  {
    Title: "Breaking Bad",
    Year: "2008–2013",
    imdbID: "tt0903747",
    Type: "series",
    Poster: "https://m.media-amazon.com/images/M/MV5BYmQ4YWMxYjUtNjZmYi00MDQ1LWFjMjMtNjA5ZDdiYjdiODU5XkEyXkFqcGdeQXVyMTMzNDExODE5._V1_SX300.jpg",
    Plot: "A chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine with a former student in order to secure his family's future.",
    Director: "N/A",
    Writer: "Vince Gilligan",
    Actors: "Bryan Cranston, Aaron Paul, Anna Gunn",
  },
  {
    Title: "Fight Club",
    Year: "1999",
    imdbID: "tt0137523",
    Type: "movie",
    Poster: "https://m.media-amazon.com/images/M/MV5BMmEzNTkxYjQtZTc0MC00YTVjLTg5ZTEtZWMwOWVlYzY0NWIwXkEyXkFqcGdeQXVyNzkwMjQ5NzM@._V1_SX300.jpg",
    Plot: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
    Director: "David Fincher",
    Writer: "Chuck Palahniuk, Jim Uhls",
    Actors: "Brad Pitt, Edward Norton, Meat Loaf",
  }
];

let movies = defaults;


const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "Review Movie Project",
    password: "Atearose01",
    port: 5432,
  });

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/",async(req,res)=>{

  for(let index =0; index<movies.length; index++){
  const id =movies[index].imdbID;
  try{
    const result = await db.query("SELECT review FROM reviews WHERE imdbid = $1",[id]);
    const data = result.rows;
    const obj = data[0];
    if(obj !== undefined){
      const Review = obj.review;
      movies[index]['Review'] = Review;
      //console.log(Review);
    }

  }catch(err){
    console.log(err);
  }
}
  //console.log(movies);
  res.render("index.ejs",{Movies:movies});
})


app.post("/",async(req,res)=>{
  movies=[];
  const title = req.body.title
  const type = req.body.type

  try{
    const result = await axios.get(`${API_URL}/?apikey=${apikey}&s=${title}&type=${type}&page=1`);
    const data = result.data;
    //console.log(data.Search);
    const response = data.Response; //response

    if(response === "False"){ //for respone "False"
    const error = data.Error; //error
    res.render("index.ejs",{Movies:movies,Error:error});
    movies = defaults; //after error, reset to defaults movies
    }else{ // for respone "True"
      const searchResult = data.Search;
      movies=searchResult;
      
      for(let index =0; index<movies.length; index++){
        if(movies[index].Poster === 'N/A'){
        movies[index].Poster = "images/NotFound.jpg";}

      const id =movies[index].imdbID; // use id to advance search
      const Data = await axios.get(`${API_URL}/?apikey=${apikey}&i=${id}&plot=full`);
      const plot = Data.data.Plot;
      const director = Data.data.Director;
      const writer = Data.data.Writer;
      const actor = Data.data.Actors;
      movies[index]['Plot'] = plot; // add other element
      movies[index]['Director'] = director;
      movies[index]['Writer'] = writer;
      movies[index]['Actors'] = actor;
      //เพิ่มดึงข้อมูลreviewจากpgAdmin
      try{
        const result = await db.query("SELECT review FROM reviews WHERE imdbid = $1",[id]);
        const data = result.rows;
        const obj = data[0];
        if(obj !== undefined){
          const Review = obj.review;
          movies[index]['Review'] = Review;
        }
    
      }catch(err){
        console.log(err);
      }
      }
      
      //console.log(movies);
      res.redirect("/");
    }
  }catch(err){
console.log(err);
  }
})

app.post("/review",(req,res)=>{
  const index = req.body.id;
  const movie = movies[index];

  res.render("review.ejs",{movie:movie});
})

app.post("/result",async (req,res)=>{

  const id = req.body.imdbID;
  const result = await axios.get(`${API_URL}/?apikey=${apikey}&i=${id}&plot=full`);
  const data = result.data;
  movies=[data];
  const review = req.body.review //เอาค่าreview จาก review.ejs
  if(review && review.length > 0){
   try{
    await db.query("INSERT INTO reviews (review,imdbid) VALUES ($1,$2)",[review,id]);
   }catch(err){
    console.log(err);
   }}
   res.redirect("/");
}
);


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });