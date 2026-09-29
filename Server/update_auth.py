path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Server/controllers/authController.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target_destructure = """    const {
  fullName,
  email,
  phone,
  password,
  district,
  state,
  role,
  adminSecretKey,
} = req.body;"""

replacement_destructure = """    const {
  fullName,
  email,
  phone,
  password,
  district,
  state,
  role,
  adminSecretKey,
  gender,
  dateOfBirth,
} = req.body;"""

content = content.replace(target_destructure, replacement_destructure)

target_create = """    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      district,
      state,
      role: finalRole,
    });"""

replacement_create = """    // Create user
    const user = await User.create({
      fullName,
      email,
      phone,
      password: hashedPassword,
      district,
      state,
      gender,
      dateOfBirth,
      role: finalRole,
    });"""

content = content.replace(target_create, replacement_create)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated authController.js")
