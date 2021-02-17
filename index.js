const db = firebase.firestore();

const app = Sammy('#root', function () {

    this.use('Handlebars', 'hbs');    

    // Home route
    this.get('/home', function () {        
        
        db.collection("shoes").get()
        .then((res) => {
            this.shoes = res.docs.map((shoe) => {return {id: shoe.id, ...shoe.data()}}); 
        }).then((shoes) => {

            extendContext (this)        
            .then(function () {
            this.partial('./templates/home.hbs');
        })
        }).catch(errorHandler);            
        
    });

    // User routes
    this.get('/register', function () {
     extendContext (this)
        .then(function () {
            this.partial('./templates/register.hbs');
        });
    });

    this.get('/login', function () {
     extendContext (this)
        .then(function () {
            this.partial('./templates/login.hbs');
        });
    });

    this.get('/logout', function () {
        firebase.auth().signOut().then(() => {
            
            clearUserData();

            this.redirect('#/login');
          })
          .catch((error) => {
            errorHandler(error)
          });
    });
    
    this.post('/register', function () {
        let {email, password, repeatPassword} = this.params;
        if (!email || !password || !repeatPassword) {
            alert("Invalit inputs!");
        } 
        else if (password != repeatPassword) {
            alert("Passwords does not match!");
        } 
        else {            
            firebase.auth().createUserWithEmailAndPassword(email, password)
            .then(userData => {
                this.redirect('/home');
            })
            .catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                if (errorCode == 'auth/weak-password') {
                  alert('The password is too weak.');
                } else {
                  alert(errorMessage);
                }
            });
        }
    });

    this.post('/login', function () {
        let {email, password} = this.params;
        if (!email) {
            alert("Email cannot be empty!");
        } 
        else if (!password) {
            alert("Password cannot be empty!");
        } 
        else {
            firebase.auth().signInWithEmailAndPassword(email, password)
            .then(userData => {
                saveUserData(userData);
                this.redirect('#/home');
            })
            .catch(error => {
                errorHandler(error)
            });
        }
    });

    // Offers routes
    this.get('/create-offer', function () {
     extendContext (this)
        .then(function () {
            this.partial('./templates/createOffer.hbs');
        });
    });

    this.get('/details/:id', function () {
        let { id } = this.params;
        db.collection("shoes")
        .doc(id)
        .get()
        .then(shoe => {
            let shoeData = shoe.data();
            let user = getUserData().email;
            let isYourOffer = shoeData.creator === getUserData().uid;
            let alredyBought = shoeData.buyers.find(buyer => buyer === user) ? true : false;

            this.shoe = {id, ...shoeData, isYourOffer, alredyBought};
            
            extendContext (this)
            .then(function () {
            this.partial('./templates/details.hbs');
            });
        }).catch(errorHandler);
    });

    this.get('/delete/:id', function () {
        let { id } = this.params;
        
        db.collection('shoes').doc(id)
        .delete()
        .then(data => {
            this.redirect('#/home');
        })
        .catch(errorHandler);
    });

    this.get('/edit/:id', function () {
        let { id } = this.params;

        db.collection('shoes')
        .doc(id)
        .get()
        .then(shoe => {
            let shoeData = shoe.data();
            this.shoe = {id, ...shoeData};
            extendContext (this)
            .then(function () {
            this.partial('./templates/editOffer.hbs');
            });
        });
        
    });

    this.post('/create-offer', function () {
        const { name, price, imageUrl, description, brand } = this.params;
        if (!name || !price || !imageUrl || !description || !brand) {
            alert('Provide full information of the product');
        }
        else {
            db.collection('shoes').add({
                name,
                price,
                imageUrl,
                description,
                brand,
                creator: getUserData().uid,
                buyers: []
            })
            .then(data => {
                this.redirect('#/home');
            })
            .catch(error => {errorHandler(error)});
        }        
    });

    this.post('/edit/:id', function () {
        const { id, name, price, imageUrl, description, brand } = this.params;
        if (!name || !price || !imageUrl || !description || !brand) {
            alert('Provide full information of the product');
        }
        db.collection('shoes')
        .doc(id)
        .update({ id, name, price, imageUrl, description, brand })
        .then(data => {
            this.redirect(`#/details/${id}`);
        })
        .catch(errorHandler);
    });

    this.get('/buy/:id', function() {
        let { id } = this.params;
        let userEmail = getUserData().email;
        db.collection('shoes')
        .doc(id)
        .get()
        .then(response => {
            let offerData= {...response.data()};
            offerData.buyers.push(userEmail);

            return db.collection('shoes')
                .doc(id)
                .set(offerData);
        })
        .then(data => {
            this.redirect(`/details/${id}`)
        })
        .catch(errorHandler);
    });
});

(() => {
    app.run('#/home');
})();

function extendContext (context) {
    const user = getUserData();
    context.isLoggedIn = Boolean(user);
    context.email = user ? user.email : '';

    return context.loadPartials({
        'header': './templates/partials/header.hbs',
        'footer': './templates/partials/footer.hbs'
    });
}

function errorHandler(error) {
    console.error(error.code);
    alert(error.message);
}

function saveUserData(data) {
    const { user: {email, uid} } = data;
    localStorage.setItem('user', JSON.stringify({ email, uid }))
}

function getUserData () {
    const user = localStorage.getItem('user');

    return user ? JSON.parse(user) : null;
}

function clearUserData() {
    this.localStorage.removeItem('user');
}