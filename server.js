const express = require('express');
const app = express();
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
app.use(cors())
const Clarifai = require('clarifai');
app.use(express.json());

const capp = new Clarifai.App({
	apiKey: '051186c68401496bbcca319274dd6e40'
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; 
const knex = require('knex');
const db=knex({
  client: 'pg',
  connection: {
    connectionString : process.env.DATABASE_URL,
    ssl : true
    
  }
}); 

app.get('/',(req,res)=>{
	res.json('It is working');
})


app.post('/signin',(req,res) =>{
		const {email,password} = req.body;
			if(!email||!password){
				return res.status(400).json('invalid request');
			}

			db.select('email', 'hash').from('login')
				.where('email', '=', req.body.email)
					.then(data=>{
				const isValid=bcrypt.compareSync(req.body.password, data[0].hash)
				if(isValid)
					{
						return db.select('*').from('users')
								.where('email','=',req.body.email)
								.then(user=>{
								res.json(user[0]);
								})
						.catch(err=>res.status(400).json('unable to get user'));
					}
				else
					{
					res.status(400).json('wrong password');
					}
			})
		  	.catch(err=>res.status(400).json('invalid credentials'));
})

app.post('/register', (req,res)=>{
		const {email , name ,password} = req.body;
			if(!email||!name||!password){
				return res.status(400).json('invalid request');
			}
			const hash = bcrypt.hashSync(password);
				db.transaction(trx=>{
					trx.insert({
						hash:hash,
						email:email
					})
					.into('login')
					.returning('email')
					.then(loginEmail=>{
						return trx('users')
			         	.returning('*')
			         	.insert({
						    name:name,
						    email: loginEmail[0],
						    join: new Date(),
						    entries:0
						})
					    .then(user=>{
					         res.json(user[0]);
		               	})
					})
					.then(trx.commit) 
         	})
         	.catch(err=>{
         		res.status(400).json(err);
         	})

})

app.put('/image',(req,res)=>{
	const { id }= req.body;
		db('users').where('id', '=', id)
			.increment('entries',1)
			.returning('entries')
			.then(entries=>{
				res.json(entries[0]);
			})
			.catch(err=>{
				res.status(400).json('something went wrong');
			})
		})

app.post('/imageurl',(req,res)=>{
		const {input} = req.body;
		if(!input) {
			return res.status(400).json('empty request');
		}
			capp.models.predict(
     	 		Clarifai.FACE_DETECT_MODEL,
     			req.body.input)
			.then(data=>{res.json(data);
			})
			.catch(err=>
				res.json(err));
			
		})
		



app.listen(process.env.PORT ||3000,() => {
	console.log(`app is running on port ${process.env.PORT}`);
})