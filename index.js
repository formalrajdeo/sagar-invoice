const express = require('express');
const app = express();
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");
const session = require('express-session');

app.use(session({
  secret: 'your_secret_key', // Change this to a random secret key
  resave: false,
  saveUninitialized: false
}));
app.set('view engine', 'ejs');
app.use(express.json());

const html_to_pdf = async ({ templateHtml, dataBinding, options }) => {
  const template = handlebars.compile(templateHtml);
  const finalHtml = encodeURIComponent(template(dataBinding));

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(`data:text/html;charset=UTF-8,${finalHtml}`, {
    waitUntil: "networkidle0",
  });

  let pdfBuffer = await page.pdf(options); // based on = pdf(options?: PDFOptions): Promise<Buffer>; from https://pptr.dev/api/puppeteer.page.pdf pdfBuffer will stored the PDF file Buffer content when "path is not provoded" 
  await browser.close();
  return pdfBuffer; // Returning the value when page.pdf promise gets resolved
};

// app.get('/', (req, res) => {
//   res.json({
//     status: 200,
//     message: "Welcome to invoice system."
//   });
// });

// Render the form
app.get('/', (req, res) => {
  res.render('login');
});

const isAuthenticated = (req, res, next) => {
  console.log({ ola: req.session });
  if (req.session.user) {
    next(); // User is authenticated, proceed
  } else {
    res.redirect('/login'); // User is not logged in, redirect to login page
  }
};

// Render the form
app.get('/form', isAuthenticated, (req, res) => {
  res.render('form');
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Define route to serve the login form
app.get('/login', (req, res) => {
  res.render('login');
});

// Define route to handle login form submission
app.post('/login', (req, res) => {
  // Retrieve username and password from the request body
  const { username, password } = req.body;
  console.log({ reqbody: req.body });
  // Here, you would typically validate the username and password
  // For simplicity, let's assume a hardcoded username and password
  const validUsername = 'sagar';
  const validPassword = 'Password@123';

  if (username === validUsername && password === validPassword) {
    // Set user session
    req.session.user = username;
    // Redirect to form page after successful login
    res.redirect('/form');
  } else {
    // If credentials are invalid, render the login form again with an error message
    res.render('login', { error: 'Invalid username or password' }); // Pass error message
  }
});

app.post('/api/download-invoice', isAuthenticated, async (req, res) => {
  try {
    if (!req.body?.dataBinding) {
      return res.json({ status: 400, message: 'Invalid input received' });
    }

    const { dataBinding } = req.body;
    console.log({ dataBinding, ola: typeof dataBinding });
    const templateHtml = fs.readFileSync(
      path.join(process.cwd(), "invoice.html"),
      "utf8"
    );

    const options = {
      format: "A4",
      headerTemplate: "<p></p>",
      footerTemplate: "<p></p>",
      displayHeaderFooter: false,
      margin: {
        top: "40px",
        bottom: "100px",
      },
      printBackground: true,
      path: "invoice.pdf",
    };

    const pdfBuffer = await html_to_pdf({ templateHtml, dataBinding, options });

    if (pdfBuffer) {
      console.log("Done: invoice.pdf is created!");
      // Send the PDF file as a response
      res.contentType("application/pdf");
      res.send(pdfBuffer);
    } else {
      res.json({
        status: 500,
        message: 'Failed to download invoice'
      });
    }
  } catch (err) {
    console.log("ERROR:", err);
    res.json({
      status: 500,
      message: 'Internal server error',
      err
    });
  }
});


// Error handling Middleware function for logging the error message
const errorLogger = (error, request, response, next) => {
  console.log(`error ${error.message}`);
  next(error); // calling next middleware
};

// Error handling Middleware function reads the error message 
// and sends back a response in JSON format
const errorResponder = (error, request, response, next) => {
  response.header("Content-Type", 'application/json');

  const status = error.status || 400;
  response.status(status).send(error.message);
};

// Fallback Middleware function for returning 
// 404 error for undefined paths
const invalidPathHandler = (request, response, next) => {
  response.status(404);
  response.send('invalid path');
};

// Route with a handler function which throws an error
app.get('/productswitherror', (request, response) => {
  let error = new Error(`processing error in request at ${request.url}`);
  error.statusCode = 400;
  throw error;
});

// Attach the first Error handling Middleware
// function defined above (which logs the error)
app.use(errorLogger);

// Attach the second Error handling Middleware
// function defined above (which sends back the response)
app.use(errorResponder);

// Attach the fallback Middleware
// function which sends back the response for invalid paths)
app.use(invalidPathHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});