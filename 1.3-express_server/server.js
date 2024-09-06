const express = require('express');
const { Storage } = require('@google-cloud/storage');

const app = express();
const PORT = process.env.PORT || 8080;

// Set up Google Cloud Storage
const storage = new Storage({
  keyFilename: 'app_engine-credential.json',
  projectId: 'cse4265-2024-792826', // FIXME: put your projectID here
});
const bucketName = 'cse4265-2024-792826.appspot.com'; // FIXME: put your bucket name here

// Route to serve video files from root
app.get('/video/:filename', async (req, res, next) => {
  // TODO:
  // 1. retrieve file name from request parameters
  // 2. retireve the file from storage bucket
  // 3. Pipe the read stream to the response >> https://cloud.google.com/storage/docs/streaming-downloads

  try {
    const filename = req.params.filename;
    
    if (!filename) {
            res.status(400).send('Bad Request, filename is required, eg: /video/filename.mp4');
            return;
    }

    storage
      .bucket(bucketName)
      .file(filename)
      .createReadStream()
      .pipe(res);
  }
  catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});