import express from "express";
import bodyParser from "body-parser";
import pg from "pg"
import axios from "axios";
import defaultMovieList from "./default-movie-list.js";

const app = express();
const port = 3000;
const API_URL = "https://www.omdbapi.com"
const apikey = "f01dd666"

let movies = defaultMovieList;


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
    const Review = obj.review;
    movies[index]['Review'] = Review;
      //console.log(Review);
    }catch(err){/*console.log(err);*/}
  
    try{
    const result = await db.query("SELECT rating FROM reviews WHERE imdbid = $1",[id]);
    const data = result.rows;
    const obj = data[0];
    const Score = obj.rating;
      if(Score !== null){
        movies[index]['Score'] = Score;
      }else{
      movies[index]['Score'] = 0;
      }
      }catch(err){/*console.log(err);*/}
  }

  let scoreArray = [];
  let star = ["","","","",""]

  for(let index =0; index<movies.length; index++){
    let Score = movies[index].Score;
    if(Score>0){
      star[Score-1] = "checked";
      scoreArray.push(star);
    }else{
      scoreArray.push(star);
    }
    //console.log(Score);
    star = ["","","","",""];
  }
  //console.log(scoreArray);
  //console.log(movies);
  res.render("index.ejs",{Movies:movies,scoreList:scoreArray});
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

      }
    }
      }catch(err){console.log(err);}

  res.redirect("/");
})

app.post("/review",async(req,res)=>{
  const index = req.body.id;
  const movie = movies[index];


  let scoreArray = [];
  let star = ["","","","",""]

  let Score = movie.Score;
  if(Score >0){
    star[Score-1] = "checked";
    scoreArray.push(star);
  }else{
    scoreArray.push(star);
  }

  star = ["","","","",""];

  res.render("review.ejs",{movie:movie,scoreList:scoreArray});
})

app.post("/result",async (req,res)=>{

  const id = req.body.imdbID;
  const result = await axios.get(`${API_URL}/?apikey=${apikey}&i=${id}&plot=full`);
  const data = result.data;
  movies=[data];
  const review = req.body.review //เอาค่าreview จาก review.ejs
  const score = req.body.rate;

  if(review && review.length > 0){
  movies[0]['Review'] = review;
   try{
    await db.query("INSERT INTO reviews (review,imdbid) VALUES ($1,$2)",[review,id]);
   }catch(err){console.log(err);}
  }

  if(score !== undefined){
  movies[0]['Score'] = score;
  try{
    await db.query("INSERT INTO reviews (rating,imdbid) VALUES ($1,$2)",[score,id]);
  }catch(err){console.log(err);}
  }


   //console.log(score);
   res.redirect("/");
})

app.post("/edit",async(req,res)=>{
  const id = req.body.imdbID;
  const result = await axios.get(`${API_URL}/?apikey=${apikey}&i=${id}&plot=full`);
  const data = result.data;
  movies=[data];
  const review = req.body.review //เอาค่าreview จาก review.ejs
  const score = req.body.rate;
  if(review && review.length > 0){
  movies[0]['Review'] = review;
   try{
    await db.query("UPDATE reviews SET review = $1 WHERE imdbid = $2",[review,id]);
   }catch(err){console.log(err); }
  }

   if(score !== undefined){
    movies[0]['Score'] = score;
    try{
      await db.query("UPDATE reviews SET rating = $1 WHERE imdbid = $2",[score,id]);
     }catch(err){console.log(err); }
    } else {
      movies[0]['Score'] = 0;
      try{
        await db.query("UPDATE reviews SET rating = $1 WHERE imdbid = $2",[score,id]);
       }catch(err){console.log(err); }
    }

  //console.log(movies);
   res.redirect("/");
})

app.post("/home",(req,res)=>{
  movies = defaultMovieList;
  res.redirect("/");
})


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });