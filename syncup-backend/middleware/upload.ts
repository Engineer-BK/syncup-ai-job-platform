import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

/**
 * Configure AWS S3 Client for Multer S3 Storage engine
 */
const s3Config = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * FILE UPLOAD MIDDLEWARE (MULTER + AWS S3)
 * 
 * HOW IT WORKS:
 * 1. When a user submits a form with a PDF file (e.g. `upload.single('resume')`), 
 *    Multer intercepts the incoming HTTP multipart payload stream.
 * 2. `multerS3` streams the incoming binary file directly into our Amazon S3 bucket.
 * 3. `fileFilter` ensures only valid PDF documents (`application/pdf`) are allowed.
 * 4. `limits` restricts maximum file size to 5MB to prevent storage abuse.
 * 5. `key` generates a unique filename using a timestamp to prevent overwriting existing files.
 */
const upload = multer({
  storage: multerS3({
    s3: s3Config,
    bucket: process.env.AWS_BUCKET_NAME || "mys3bucket-bk",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    // Store uploaded files under `resumes/` folder in S3 with unique timestamp prefix
    key: function (req, file, cb) {
      const sanitizedFileName = file.originalname.replace(/\s+/g, "_");
      cb(null, `resumes/${Date.now()}-${sanitizedFileName}`);
    },
  }),
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5 MB maximum file size limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept PDF documents
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type: Only PDF files (.pdf) are allowed!"));
    }
  },
});

export default upload;
