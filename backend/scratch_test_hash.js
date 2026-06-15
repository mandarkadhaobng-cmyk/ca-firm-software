const bcrypt = require('bcryptjs');

async function test() {
  const hash = '$2a$10$ruN8NLqxia314Vd6eJNIBuw4trEcVQ650B4WEpZ7kKYEuyho3GrbS'; // From reset-login.bat
  const valid = await bcrypt.compare('admin123', hash);
  console.log('Is valid admin123:', valid);
}
test();
