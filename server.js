const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

const pool = mysql.createPool({
    host: 'mysql-d381cba-renaudlavioletteharvengt-95f8.aivencloud.com',
    user: 'tp2-user',
    password: 'AVNS_DswJHf6kVR2qeI11Tnx',
    database: 'defaultdb',
    port: 19034
});

app.use(
    bodyParser.json(),
    session({
        secret: 'secret-key',
        resave: false,
        saveUninitialized: true
    })
);

//Requête pour se connecter
app.post('/api/login', async (req, res) => {
    try{
        const { username, password } = req.body;

        //Valide le data reçu
        if(typeof username === 'undefined' || typeof password === 'undefined'){
            return res.status(400).json({ message: 'Data invalide' });
        }

        //Vérifie que l'user existe
        const [utilisateurExistant] = await pool.execute('SELECT * FROM Utilisateur WHERE username = ?', [username]);
        if (utilisateurExistant.length > 0) {
            //Vérifie que le mot de passe est correct
            const passwordBD = utilisateurExistant[0].password;
            const passwordMatch = await bcrypt.compare(password, passwordBD);

            //Login fonctionnel
            if(passwordMatch){
                req.session.user = { username: username };
                res.status(200).json({ message: 'Login fonctionnel' });
            } else {
                //Mauvais mot de passe
                res.status(401).json({ message: 'Mauvais mot de passe' });
            }

        } else {
            //L'utilisateur n'existe pas 
            res.status(404).json({ message: 'Utilisateur inexistant' });
        }

    } catch (error){
        console.error('Erreur de connexion:', error);
        res.status(500).json({message: 'Internal server error'});
    }
})

//Requête pour se déconnecter
app.get('/api/logout', (req, res) => {
    req.session.destroy((error) => {
        if(error){
            console.error('Erreur de destruction de session', error);
            return res.status(500).json({ message: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Déconnecté' });
    });
});

//Requête pour créer un nouvel utilisateur
app.post('/api/register', async (req, res) => {
    try{
        const { username, password } = req.body;
        
        //Valide le data reçu
        if(typeof username === 'undefined' || typeof password === 'undefined'){
            return res.status(400).json({ message: 'Data invalide' });
        }

        //Vérifie que l'username n'existe pas déjà
        const [utilisateurExistant] = await pool.execute('SELECT * FROM Utilisateur WHERE username = ?', [username]);
        if (utilisateurExistant.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        //Hash le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        //Insère l'utilisateur
        const [results] = await pool.execute('INSERT INTO Utilisateur (username, password) VALUES (?, ?)', [username, hashedPassword]);

        if(results.affectedRows === 1) {
            res.status(201).json({ message: 'Utilisateur ajouté avec succès' });
        } else {
            res.status(500).json({ message: 'Erreur ajout utilisateur' });
        }
    } catch (error){
        console.error('Erreur register:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Requête pour créer un nouvel évènement
app.post('/api/create-evenement', async (req, res) => {
    try {
        const { date, nom, utilisateurID } = req.body;
        
        //Valide le data reçu
        if (typeof date === 'undefined' || typeof nom === 'undefined' || typeof utilisateurID === 'undefined'){
            return res.status(400).json({ message: 'Data invalide' });
        }

        //Vérifie l'existence de l'utilisateur
        const [utilisateurExistant] = await pool.execute('SELECT * FROM Utilisateur WHERE id = ?', [utilisateurID]);
        if (utilisateurExistant.length === 0) {
            return res.status(400).json({ message: 'Utilisateur inexistant' });
        }
        
        //Insère l'évènement
        const [results] = await pool.execute('INSERT INTO Evenement (date, nom, utilisateur_id) VALUES (?, ?, ?)', [date, nom, utilisateurID]);

        if (results.affectedRows === 1){
            res.status(201).json({ message: 'Évènement ajouté' });
        } else {
            res.status(500).json({ message: 'Erreur de création' });
        }

    } catch (error){
        console.error('Erreur de création:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Requête pour get les évènements d'un utilisateur
app.get('/api/evenements/:utilisateurID', async (req, res) => {
    try {
        const utilisateurID = req.params.utilisateurID;

        //Vérifie l'existence de l'utilisateur
        const [utilisateurExistant] = await pool.execute('SELECT * FROM Utilisateur WHERE id = ?', [utilisateurID]);
        if (utilisateurExistant.length === 0) {
            return res.status(400).json({ message: 'Utilisateur inexistant' });
        }
        
        //Sélectionne et retourne les évènements
        const [evenements] = await pool.execute('SELECT * FROM Evenement WHERE utilisateur_id = ?', [utilisateurID]);
        res.status(200).json(evenements);
    } catch (error){
        console.error('Erreur de récupération des évènements:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Serveur run sur le port ${port}`);
});

//Requête pour supprimer un event
app.delete('/api/delete-event/:evenementID', async (req, res) => {
    try{
        const evenementID = req.params.evenementID;        

        const [results] = await pool.execute('DELETE FROM Evenement WHERE id = ?', [evenementID]);

        if(results.affectedRows === 1){
            res.status(200).json({ message: 'Evenement supprimé' });
        } else {
            res.status(404).json({ message: 'Evenement inexistant'});
        }
    } catch (error){
        console.error('Erreur de suppression', error);
        res.status(500).json({ message: 'Internal server error'});
    }
});