const { request } = require('express')
const express = require('express')

const db = require ('./connection/db')
const upload = require('./middlewares/uploadFile')

const bcrypt = require ('bcrypt')
const session = require ('express-session')
const flash = require ('express-flash')

const app = express()
const PORT = 5000

let isLogin = true

let blogs = [{
    title : 'Pasar Coding di Indonesia Dinilai Masih Menjanjikan',
    content :" Ketimpangan sumber daya manusia (SDM) di sektor digital masih menjadi isu yang belum terpecahkan. Berdasarkan penelitian ManpowerGroup, ketimpangan SDM global, termasuk Indonesia",
    author : 'Ichsan Emrald Alamsyah',
    post_at : '12 Jul 2021 22:30 WIB'
}]
let month = ['Januari',
            'Februari',
            'Maret',
            'April',
            'Mei',
            'Juni',
            'Juli',
            'Agustus',
            'September',
            'Oktober',
            'November',
            'Desember']

app.set('view engine', 'hbs')
app.use('/public', express.static(__dirname + '/public'))
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(express.urlencoded({extended:false}))

app.use(
    session(
      {
        cookie: {
          maxAge: 2 * 60 * 60 * 1000,
          secure: false,
          httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: 'secretValue'
      }
    )
)

app.use(flash())

app.get('/', function(req, res){
    db.connect(function(err, client, done){
        if (err) throw err
 
        client.query ('SELECT * FROM tb_experience', function(err, result){
            if (err) throw err
            done()
            let dataex = result.rows

            res.render("index" , {data: dataex, user:req.session.user, isLogin : req.session.isLogin})
           })
        })
})


app.get('/blog', function(req, res){

    let query = `SELECT tb_blog.id, tb_blog.title, tb_blog.content, tb_blog.image, tb_user.name AS author, tb_blog.post_date FROM tb_blog LEFT JOIN tb_user ON tb_user.id = tb_blog.author_id ORDER BY ID DESC`

   db.connect(function(err, client, done){
       if (err) throw err

       client.query (query, function(err, result){
           done()
           let data = result.rows

          let dataLogin = data.map(function(item){
              return {
                  ...item,
                  isLogin : req.session.isLogin,
                  post_at: getFullTime(item.post_date),
                  post_age: getDistanceTime(item.post_date),
                  images : '/uploads/'+item.image
                  
              }
          })
          console.log(dataLogin)

           res.render("blog", {isLogin : req.session.isLogin, blogs:dataLogin, user:req.session.user})
       })
   })
})
app.get('/contact', function(req, res){
    res.render("contact-form", {user:req.session.user, isLogin : req.session.isLogin})
})

app.get('/add-blog', function(req, res){
    res.render('add-blog',{user:req.session.user,isLogin : req.session.isLogin})
})
app.get('/detail-blog/:id', function(req, res){
    let id = req.params.id

    db.connect(function(err, client, done){
        if (err) throw err
 
        client.query (`SELECT * FROM tb_blog WHERE id = ${id}`, function(err, result){
            if (err) throw err
            let data = result.rows[0]

            res.render('detail-blog', {id : id, blog: data, user:req.session.user,isLogin : req.session.isLogin })
        })
    })
})

app.post('/blog', upload.single('image'),function(req, res){
    let data = req.body
    if(!req.session.user){
        req.flash('danger','Please-Login')
        return res.redirect('/add-blog')
    }

    if (!req.file.filename){
        req.flash('danger','Please insert All field')
        return res.redirect('/add-blog')
    }

    let image = req.file.filename
    let userId = req.session.user.id
    db.connect(function(err, client, done){ 
        if (err) throw err
 
        client.query (`INSERT INTO tb_blog (title, image, content, author_id) VALUES('${data.title}', '${image}', '${data.content}', ${userId})`, function(err, result){
           if (err) throw err
            done()

            req.flash('AddSucces','New blog added successfully')
            res.redirect('/blog')
        })
    })
})

app.get('/home', function(req, res){
    db.connect(function(err, client, done){
        if (err) throw err
 
        client.query ('SELECT * FROM tb_experience', function(err, result){
            if (err) throw err
            done()
            let dataex = result.rows

            res.render("index" , {data: dataex, user:req.session.user, isLogin : req.session.isLogin})
           })
        })
})

app.get('/delete-blog/:id', function(req, res){
   const id = req.params.id
    db.connect(function(err, client, done){
        if (err) throw err
 
        client.query (`DELETE FROM tb_blog where id = ${id}`, function(err, result){
            done()

            req.flash('delSucces','Your blog has been deleted successfully')
            res.redirect('/blog')
        })
    })
})
app.get('/edit-blog/:id', function(req, res){
    const id = req.params.id
    db.connect (function(err, client, done){
        if (err) throw err

        client.query(`SELECT * FROM tb_blog where id = ${id}`, function(err, result){
            if (err) throw err
            done()

            let data = result.rows

            res.render('edit-blog' ,{data:data, user:req.session.user, isLogin : req.session.isLogin})
        })
    })
})

app.post('/edit-blog/:id', function(req, res){
    const id = req.params.id
    let data = req.body
    let query = `UPDATE tb_blog SET title = '${data.title}', image = '${data.image}', content = '${data.content}' WHERE id = ${id} `
    db.connect(function(err, client, done){
        if (err) throw err
 
        client.query (query, function(err, result){
            if (err) throw err
            done()

            req.flash('editSucces','Your blog has been changed successfully')
            res.redirect('/blog')
        })
    })
})

app.get('/login', function(req, res){
    res.render("login", {user:req.session.user, isLogin : req.session.isLogin})
})

app.post('/login', function(req, res){
    const { email, password } = req.body
    let query = `SELECT * FROM tb_user WHERE email = '${email}'`

    db.connect(function(err, client, done){
        if (err) throw err

        client.query(query, function(err, result){
            if (err) throw err

            if(result.rows.length == 0){
                req.flash('loginGagal', 'Wrong Username or Password')
                return res.redirect("/login")
            }
            let isMatch = bcrypt.compareSync(password, result.rows[0].password)

            if(isMatch){
                req.session.isLogin = true
                req.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email
                }
                req.flash('loginSucces', 'Login Succes')
                res.redirect("/blog")   

            }else{
                req.flash('loginGagal', 'Wrong Username or Password')
                res.redirect('/login')
            }
        })
    })
})

app.get('/register', function(req, res){
    res.render("register", {user:req.session.user, isLogin : req.session.isLogin})
})

app.post('/register', function(req, res){
    let data = req.body
    const hashPassword = bcrypt.hashSync(data.password, 10)
    db.connect(function(err, client, done){ 
        if (err) throw err
 
        client.query (`INSERT INTO tb_user (name, email, password) VALUES('${data.name}', '${data.email}', '${hashPassword}')`, function(err, result){
           if (err) throw err
            done()

            req.flash('regSucces', 'Register Succesed Please Login')
            res.redirect('/login')
        })
    })
})

app.get('/logout', function(req, res){
    req.session.destroy()
    res.redirect('/blog')
})

app.listen(process.env.PORT || PORT, function(){
    console.log(`Starting Server On port : ${PORT}`)
})

// Mengkonversi waktu
function getFullTime(time){
    let date = time.getDate()
    let monthIndex = time.getMonth()
    let year = time.getFullYear()

    let hours = time.getHours()
    let minutes = time.getMinutes()

    let fullTime = `${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB `

    return fullTime
}

function getDistanceTime(time){
    let timePost = time
    let timeNow = new Date()

    let distance = timeNow - timePost

    let milisecond = 1000
    let secondinHours = 3600
    let hoursInDay = 23

    let distanceDay = Math.floor(distance / (milisecond * secondinHours * hoursInDay))

    if(distanceDay >= 1 ){
        return(`${distanceDay} day ago`)
    } else {
        let distanceHours = Math.floor(distance / (1000 * 60 * 60))
        if (distanceHours >= 1) {
            return(`${distanceHours} Hours Ago`)
        }else {
            let distanceMinutes = Math.floor(distance / (1000 * 60))
            if (distanceMinutes >= 1){
            return(`${distanceMinutes} minutes ago`)
        }else{
            let distanceSecond = Math.floor(distance / 1000)
            return `${distanceSecond} seconds ago`
            }
        }
    }
    
}

