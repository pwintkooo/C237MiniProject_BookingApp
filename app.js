const express = require("express");
const mysql = require('mysql2');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({storage: storage});

const connection = mysql.createConnection({
    /* host: 'localhost',
    user: 'root',
    password: '',
    database: 'booking_courts_app'
    }); */
    /* host: 'sql.freedb.tech',
    user: 'freedb_C237_pwintkooo',
    password: 'a6k5#rjeJ#qk#mP',
    database: 'freedb_booking_courts_app' */
    host: 'db4free.net',
    user: 'c237_project',
    password: '123456789',
    database: 'bookingcourts'
    });
    connection.connect((err) => {
    if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
    }
    console.log('Connected to MySQL database');
    });
const bodyParser = require("body-parser")

const app = express();
app.use(express.static("public"))

app.use(bodyParser.urlencoded({extended: true}));

const port = process.env.PORT || 3000;

app.set("view engine", "ejs")

app.get("/", function(req, res) {
    const sql = 'SELECT * FROM sportcentres';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving Sport Centres');
        }
        res.render("index", {sportCentres: results});  
    });
});

app.get('/sports/:centreId', (req, res) => {
    const sportCentreId = parseInt(req.params.centreId);

    const sql = 
        `SELECT DISTINCT sports.sportId, sports.name, sports.img
        FROM sports
        INNER JOIN sportcentres_details ON sports.sportId = sportcentres_details.sportId
        WHERE sportcentres_details.centreId = ?`;
    
    connection.query(sql, [sportCentreId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving sports information');
        }
        res.render('sportsInfo', { relatedSports: results, sportCentreId });
    });
});

app.get('/schedules/:centreId/:sportId', (req, res) => {
    const sportId = parseInt(req.params.sportId);
    const sportCentreId = parseInt(req.params.centreId);

    const scheduleSql = 
        `SELECT *
        FROM schedules
        INNER JOIN sportcentres_details ON schedules.scheId = sportcentres_details.scheId
        WHERE sportcentres_details.sportId = ? AND sportcentres_details.centreId = ?`;

    const centreSql = 'SELECT * FROM sportcentres WHERE centreId = ?';

    const sportSql = 'SELECT * FROM sports WHERE sportId = ?';

    connection.query(scheduleSql, [sportId, sportCentreId], (error, scheduleResults) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving schedules information');
        }
        
        scheduleResults.forEach(sche => {
            let date = new Date(sche.date);
            let year = date.getFullYear();
            let month = date.toLocaleString('default', { month: 'long' });
            let day = date.getDate().toString().padStart(2, '0');
            let formattedDate = `${month} ${day}, ${year}`;
            sche.date = formattedDate;
        });
        
        connection.query(centreSql, [sportCentreId], (centreError, centreResults) => {
            if (centreError) {
                console.error('Database query error:', centreError.message);
                return res.status(500).send('Error retrieving sport centre information');
            }

            connection.query(sportSql, [sportId], (sportError, sportResults) => {
                if (sportError) {
                    console.error('Database query error:', sportError.message);
                    return res.status(500).send('Error retrieving sport information');
                }

                const centre = centreResults[0];
                const sport = sportResults[0];

                res.render('schedulesInfo', { relatedSchedules: scheduleResults, centre, sport });
            });
        });
    });
});

app.get("/bookings/:centreId/:sportId/:scheId", function(req, res) {
    const centreId = parseInt(req.params.centreId);
    const sportId = parseInt(req.params.sportId);
    const scheId = parseInt(req.params.scheId);

    let query = `SELECT * FROM sportcentres_details
                 INNER JOIN sportcentres ON sportcentres_details.centreId = sportcentres.centreId
                 INNER JOIN sports ON sportcentres_details.sportId = sports.sportId
                 INNER JOIN schedules ON sportcentres_details.scheId = schedules.scheId
                 WHERE sportcentres_details.centreId = ? AND sportcentres_details.sportId = ? AND sportcentres_details.scheId = ?`;

    connection.query(query, [centreId, sportId, scheId], function(error, results) {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving booking by ID');
        }

        results.forEach(sche => {
            let date = new Date(sche.date);
            let year = date.getFullYear();
            let month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-based, so add 1
            let day = date.getDate().toString().padStart(2, '0');
            let formattedDate = `${year}-${month}-${day}`;
            sche.date = formattedDate;
        });
        
        if (results.length > 0) {
            const booking = results[0];
            res.render('addBooking', { booking });
        } else {
            res.status(404).send('Booking not found');
        }
    });
});

app.post("/bookings/:centreId/:sportId/:scheId", function(req, res) {
    const {name, email, location, sport, date} = req.body;
    const { scheId } = req.params;
    const sql = 'INSERT INTO bookings (playerName, email, location, sportName, selectedDate, scheId) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [name, email, location, sport, date, scheId], (error, results) => {
        if (error) {
            console.error('Error adding booking:', error.message);
            res.render(500).send('Error adding booking');
            return;
        }
        res.redirect('/bookings');
    });
});

app.get('/bookings', (req, res) => {
    const sql = `SELECT * FROM bookings B
    INNER JOIN schedules S ON S.scheId = B.scheId`;
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving bookings');
        }
        results.forEach(booking => {
            let selectedDate = new Date(booking.selectedDate);
            let formattedDate = selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
            booking.selectedDate = formattedDate;
        });
        res.render('bookingsDetails', {bookings: results})
    });
});

app.get('/bookingsHistory', (req, res) => {
    const sql = 'SELECT * FROM bookingsHistory';
    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving bookings history');
        }
        res.render('bookingsHistory', {bookings: results})
    });
});

app.get('/updateBookings/:bookingId', (req, res) => {
    const bookingId = parseInt(req.params.bookingId);
    const sql = `SELECT * FROM bookings B
    INNER JOIN schedules S ON S.scheId = B.scheId AND bookingId = ?`;
    connection.query(sql, [bookingId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error retrieving booking by ID');
        }
        results.forEach(sche => {
            let date = new Date(sche.date);
            let year = date.getFullYear();
            let month = (date.getMonth() + 1).toString().padStart(2, '0');
            let day = date.getDate().toString().padStart(2, '0');
            let formattedDate = `${year}-${month}-${day}`;
            sche.date = formattedDate;
        });
        
        if (results.length > 0) {

            const sql2 = 'SELECT * FROM schedules ORDER BY schedules.scheId';
            connection.query(sql2, (error, schedules) => {
                if (error)
                {
                    console.error('Error fetching data:', error.message);
                    return res.status(500).send('Error Retrieving Schedules');
                }
                res.render('updateBooking', {booking: results[0], schedules: schedules});
            })
            
        } else {
            res.status(404).send('Booking not found');
        }
    });
});

app.post('/updateBookings/:bookingId', (req, res) => {
    const bookingId = req.params.bookingId;
    const {name, email, location, sport, date, slot} = req.body;
    const sql = 'UPDATE bookings SET playerName = ?, email = ?, location = ?, sportName =?, selectedDate = ?, scheId = ?';
    connection.query(sql, [name, email, location, sport, date, slot], (error, results) => {
        if (error) {
            console.error('Error updating booking:', error);
            res.status(500).send('Error updating booking');
        } else {
            res.redirect('/bookings');
        }
    });
});

app.get("/deleteBookings/:bookingId", function(req, res) {
    const bookingId = req.params.bookingId;
    const sql = 'DELETE FROM bookings WHERE bookingId = ?';
    connection.query(sql, [bookingId], (error, results) => {
        if (error) {
            console.error('Error deleting booking:', error);
            res.status(500).send('Error deleting booking');
        } else {
            res.redirect('/bookings');
        }
    });
});

app.get("/aboutUs", function(req, res) {
    res.render("aboutUs")
});

app.get("/contactUs", function(req, res) {
    res.render("contactUs");
});

app.post("/contactUs/submit", function(req, res) {
    const {name, email, phone, message} = req.body
    res.render("submitForm", {name, email, phone, message});
});

app.get("/search", (req, res) => {
    const query = req.query.query.toLowerCase();
    const sql = 'SELECT * FROM sportcentres WHERE LOWER(centrename) LIKE ?';
    const values = [`%${query}%`];

    connection.query(sql, values, (error, results) => {
        if (error) {
            return res.status(500).send('Error querying the database');
        }
        res.render('searchResults', { results, query });
    });
});

app.get("/rating/:centreId", (req, res) => {
    const centreId = req.params.centreId;
    const sql = 'SELECT * FROM sportcentres WHERE centreId = ?';
    connection.query(sql, [centreId], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving centre by ID');
        }
        if (results.length > 0) {
            res.render('rating', {centre: results[0]});
        } else {
            res.status(404).send('Centre not found');
        }
    })
})

app.post("/confirmRating", (req,res) => {
    res.render("confirmRating");
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

