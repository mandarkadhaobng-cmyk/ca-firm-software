const db=require('./config/database');
const bcrypt=require('bcryptjs');
async function test(){
  const {rows}=await db.query("SELECT email, password_hash FROM users WHERE email='mandarkadhao.bng@gmail.com'");
  console.log(rows[0]);
  const valid = await bcrypt.compare('admin123', rows[0].password_hash);
  console.log('Is valid admin123:', valid);
  process.exit(0);
}
test();
