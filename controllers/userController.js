const { prisma } = require("../db/dbconfig.js");
const bcrypt = require("bcryptjs");
const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");

function generateAccessToken(user) {
  return jwt.sign({ user_id: user.id }, process.env.SECRET_KEY, {
    expiresIn: "30d",
  });
}

module.exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please provide all the required fields",
        status: false,
      });
    }
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ msg: "User not found", status: false });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Incorrect Password", status: false });
    }

    const token = generateAccessToken(user);
    const { password: _, ...userWithoutPassword } = user; // Exclude password

    return res
      .status(StatusCodes.OK)
      .json({ status: true, user: userWithoutPassword, token });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "An error occurred while logging in",
      status: false,
    });
  }
};

module.exports.register = async (req, res, next) => {
  try {
    // console.log("in here");
    const { first_name, last_name, email, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        msg: "Please provide all the required fields",
        status: false,
      });
    }

    const emailCheck = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (emailCheck) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ msg: "Email already used", status: false });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        first_name,
        last_name,
        email,
        password: hashedPassword,
      },
    });

    const token = generateAccessToken(user);

    const { password: _, ...userWithoutPassword } = user; // Exclude password
    return res
      .status(StatusCodes.CREATED)
      .json({ status: true, user: userWithoutPassword, token });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "An error occurred while creating the user",
      status: false,
    });
  }
};

module.exports.checkUserSession = async (req, res) => {
  try {
    const { token } = req.body;

    let msg;

    jwt.verify(token, process.env.SECRET_KEY, function (err, decoded) {
      if (err) {
        // console.log(0);
        msg = "token expired";
      } else {
        // console.log(1);
        msg = "token active";
      }
    });

    res.status(StatusCodes.OK).json({ message: msg });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      msg: "An error occurred while checking user session",
      status: false,
    });
  }
};
