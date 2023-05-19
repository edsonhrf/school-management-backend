const router = require('express').Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const Teacher = require('../models/Teacher');
const Person = require('../models/Person');

//checkToken Middleware
function checkToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access denied!'})
  }

  try {
    const secret = process.env.SECRET

    jwt.verify(token, secret)

    next()
  } catch (error) {
    res.status(400).json({ message: 'Invalid token!' })
  }
}

// login
router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      //check if person exists
      const personExists = await Person.findOne({ email: email });
  
      if (!personExists) {
        return res
          .status(400)
          .json({ message: "Invalid email or person not found. Please check." });
      }
  
      // check if teacher exists
      const teacherExists = await Teacher.findOne({ person: personExists._id });
  
      if (!teacherExists) {
        return res
          .status(404)
          .json({ message: "Teacher not found. Please check." });
      }
  
      //check if password match
      const checkPassword = await bcrypt.compare(
        password,
        teacherExists.password
      );
  
      if (!checkPassword) {
        return res
          .status(401)
          .json({ message: "Invalid password. Please check." });
      }
  
      //jwt token
      const secret = process.env.SECRET;
  
      const token = jwt.sign({ id: teacherExists._id }, secret,);
  
      res.status(200).json({ message: "Authentication successful.", token })
  
    } catch (error) {
      console.error(error);
      res.status(500).json({  error: error.message .message.message });
    }
  });

// create
router.post('/', async (req, res) => {
    const { personId, subject, password, confirmPassword } = req.body

    try {
        const existingPerson = await Person.findById(personId);
        if (!existingPerson) {
            return res.status(400).json({ message: 'Invalid person ID. Person not found.' });
        }
        
        const existingTeacher = await Teacher.findOne({person: personId});
        if (existingTeacher) {
            return res.status(400).json({ message: 'Teacher already exists.' });
        }

        if (password !== confirmPassword) {
            return res.status(422).json({ message: 'Passwords do not match.' });
        }

        // create password
        const salt = await bcrypt.genSalt(12)
        const passwordHash = await bcrypt.hash(password, salt)

        const teacher = {
            person: personId,
            subject, 
            password: passwordHash,
        };

        await Teacher.create(teacher)
        res.status(201).json({ message: 'Teacher created successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// read
router.get('/', checkToken, async (req, res) => {
    try {
        const teachers = await Teacher.find().select("-password"); // "select("-password")" hide password
        res.status(200).json(teachers)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }    
});

// read by id
router.get('/:id', async (req, res) => {

    const id = req.params.id

    try {
        const teacher = await Teacher.findOne({_id: id})

        if (!teacher) {
            res.status(422).json({message: 'Teacher not found!'})
            return
        }

        res.status(200).json(teacher)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }    
});

// update all object
router.put('/:id', async (req, res) => {
    const id = req.params.id
    const { subject } = req.body

    const teacher = {
        subject
    }

    try {
        const updatedTeacher = await Teacher.updateOne({_id: id}, teacher)

        if (updatedTeacher.matchedCount === 0) {
            res.status(422).json({ message: 'Teacher not found!' });
            return
        } else {
            res.status(422).json({ message: 'Teacher updated successfully!' });
            return
        }
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
});

// delete
router.delete('/:id', async (req, res) => {
    const id = req.params.id

    const teacher = await Teacher.findOne({_id: id})

    if (!teacher) {
        res.status(422).json({ message: 'Person not found!' });
        return
    }

    try {
        await Teacher.deleteOne({_id: id})
        res.status(200).json({message: 'Teacher deleted successfully!'})
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

//update password
router.patch('/updatePassword/:id', async (req, res) => {
    const id = req.params.id;
    const { password, confirmPassword } = req.body;
  
    try {
        if (password !== confirmPassword) {
          return res.status(422).json({ message: "Passwords do not match." });
        }
  
        //create password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const updatedTeacher = await Teacher.updateOne({ _id: id }, { password: passwordHash });
        
        if (updatedTeacher.matchedCount === 0) {
          res.status(404).json({ message: "Teacher not found!" });
        } else {
          res.status(200).json({ message: "Password updated successfully!" });
        }
    } catch (error) {
       res.status(500).json({ error: error.message });
    }
  });

module.exports = router;