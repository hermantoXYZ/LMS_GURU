/** LMS backend starter matching the requested Sheets schema.
 * Set SPREADSHEET_ID, then run setupSheets().
 */
const SPREADSHEET_ID = "REPLACE_WITH_SPREADSHEET_ID";
const SHEETS = {
 users:["id_user","username","password","nama_lengkap","role","kelas","jurusan","created_at"],
 master_kelas_jurusan:["id_master","tipe","nama"],
 materi:["id_materi","id_guru","nama_guru","mapel","kelas","jurusan","judul_materi","deskripsi","youtube_url","created_at"],
 soal:["id_soal","id_materi","nomor_urut","tipe_soal","pertanyaan","opsi_a","opsi_b","opsi_c","opsi_d","opsi_e","kunci_pg","bobot_poin"],
 jawaban_siswa:["id_submit","id_materi","id_siswa","nama_siswa","kelas","jurusan","detail_jawaban","skor_pg","skor_esai","total_nilai","status_koreksi","catatan_guru","waktu_submit"],
 sessions:["token","id_user","role","expired_at"]
};
function setupSheets(){
 const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
 Object.entries(SHEETS).forEach(([name,headers])=>{
  let sh=ss.getSheetByName(name);
  if(!sh)sh=ss.insertSheet(name);
  if(sh.getLastRow()===0)sh.appendRow(headers);
  else if(sh.getLastRow()===1 && sh.getLastColumn()===1 && sh.getRange(1,1).getValue()==="")sh.getRange(1,1,1,headers.length).setValues([headers]);
 });
 return "Sheets LMS berhasil disiapkan.";
}
function doPost(e){
 try{
  const req=JSON.parse(e.postData.contents||"{}");
  return json_(dispatch_(req));
 }catch(err){return json_({ok:false,message:String(err)});}
}
function dispatch_(req){
 if(req.action==="login")return login_(req);
 if(req.action==="logout")return logout_(req);
 // API endpoint scaffolding. Require session token for all protected actions.
 const session=validateSession_(req.token);
 if(!session)return {ok:false,message:"Session tidak valid atau telah berakhir."};
 if(req.action==="get_dashboard")return dashboard_(session);
 if(req.action==="get_master")return {ok:true,data:readSheet_("master_kelas_jurusan")};
 if(req.action==="get_materi")return {ok:true,data:readSheet_("materi")};
 if(req.action==="get_soal")return getSoal_(req,session);
 if(req.action==="create_materi")return createMateri_(req,session);
 if(req.action==="create_soal")return createSoal_(req,session);
 if(req.action==="submit_jawaban")return submitJawaban_(req,session);
 return {ok:false,message:"Action belum tersedia."};
}
function login_(req){
 const rows=readSheet_("users");
 const u=rows.find(x=>String(x.username)===String(req.username)&&String(x.password)===String(req.password));
 if(!u)return {ok:false,message:"Username atau password salah."};
 const token=Utilities.getUuid()+Utilities.getUuid();
 const expires=new Date(Date.now()+8*60*60*1000);
 sheet_("sessions").appendRow([token,u.id_user,u.role,expires]);
 return {ok:true,token,user:{id_user:u.id_user,username:u.username,nama_lengkap:u.nama_lengkap,role:u.role,kelas:u.kelas,jurusan:u.jurusan}};
}
function logout_(req){
 const sh=sheet_("sessions"),data=sh.getDataRange().getValues();
 for(let i=data.length-1;i>=1;i--)if(data[i][0]===req.token){sh.deleteRow(i+1);break;}
 return {ok:true};
}
function validateSession_(token){
 if(!token)return null;
 const rows=readSheet_("sessions");
 const s=rows.find(x=>String(x.token)===String(token));
 if(!s||new Date(s.expired_at)<new Date())return null;
 return {id_user:s.id_user,role:s.role};
}
function dashboard_(s){
 const users=readSheet_("users"),materials=readSheet_("materi");
 const isAdmin=s.role==="Admin";
 return {ok:true,data:{
  users:isAdmin?users.length:undefined,
  materials:materials.filter(m=>s.role==="Guru"?String(m.id_guru)===String(s.id_user):true).length,
  kelas:readSheet_("master_kelas_jurusan").filter(x=>x.tipe==="Kelas").length
 }};
}
function createMateri_(req,s){
 if(s.role!=="Guru"&&s.role!=="Admin")return {ok:false,message:"Akses ditolak."};
 const sh=sheet_("materi");
 const id=Utilities.getUuid();
 const u=readSheet_("users").find(x=>String(x.id_user)===String(s.id_user));
 const row={id_materi:id,id_guru:s.id_user,nama_guru:u?u.nama_lengkap:"",mapel:req.mapel||"",kelas:req.kelas||"",jurusan:req.jurusan||"",judul_materi:req.judul_materi||"",deskripsi:req.deskripsi||"",youtube_url:req.youtube_url||"",created_at:new Date()};
 appendObject_(sh,SHEETS.materi,row);
 return {ok:true,id_materi:id};
}
function createSoal_(req,s){
 if(s.role!=="Guru"&&s.role!=="Admin")return {ok:false,message:"Akses ditolak."};
 const material=readSheet_("materi").find(x=>String(x.id_materi)===String(req.id_materi));
 if(!material)return {ok:false,message:"Materi tidak ditemukan."};
 if(s.role==="Guru"&&String(material.id_guru)!==String(s.id_user))return {ok:false,message:"Anda bukan pemilik materi ini."};
 const row={id_soal:Utilities.getUuid(),id_materi:req.id_materi,nomor_urut:req.nomor_urut||1,tipe_soal:req.tipe_soal||"PG",pertanyaan:req.pertanyaan||"",opsi_a:req.opsi_a||"",opsi_b:req.opsi_b||"",opsi_c:req.opsi_c||"",opsi_d:req.opsi_d||"",opsi_e:req.opsi_e||"",kunci_pg:req.kunci_pg||"",bobot_poin:req.bobot_poin||1};
 appendObject_(sheet_("soal"),SHEETS.soal,row);
 return {ok:true};
}
function getSoal_(req,s){
 const material=readSheet_("materi").find(x=>String(x.id_materi)===String(req.id_materi));
 if(!material)return {ok:false,message:"Materi tidak ditemukan."};
 if(s.role==="Guru"&&String(material.id_guru)!==String(s.id_user))return {ok:false,message:"Akses ditolak."};
 const rows=readSheet_("soal").filter(x=>String(x.id_materi)===String(req.id_materi));
 // Hide answer key from student payload.
 if(s.role==="Siswa")rows.forEach(x=>delete x.kunci_pg);
 return {ok:true,data:rows};
}
function submitJawaban_(req,s){
 if(s.role!=="Siswa")return {ok:false,message:"Hanya siswa yang dapat mengirim jawaban."};
 const u=readSheet_("users").find(x=>String(x.id_user)===String(s.id_user));
 if(!u)return {ok:false,message:"Data siswa tidak ditemukan."};
 const row={id_submit:Utilities.getUuid(),id_materi:req.id_materi,id_siswa:s.id_user,nama_siswa:u.nama_lengkap,kelas:u.kelas,jurusan:u.jurusan,detail_jawaban:JSON.stringify(req.detail_jawaban||{}),skor_pg:0,skor_esai:0,total_nilai:0,status_koreksi:"Belum dikoreksi",catatan_guru:"",waktu_submit:new Date()};
 appendObject_(sheet_("jawaban_siswa"),SHEETS.jawaban_siswa,row);
 return {ok:true};
}
function readSheet_(name){
 const sh=sheet_(name),values=sh.getDataRange().getValues();
 if(values.length<2)return [];
 const headers=values[0];
 return values.slice(1).filter(r=>r.some(v=>v!=="")).map(r=>{let o={};headers.forEach((h,i)=>o[h]=r[i]);return o;});
}
function appendObject_(sh,headers,obj){sh.appendRow(headers.map(h=>obj[h]===undefined?"":obj[h]));}
function sheet_(name){
 const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
 let sh=ss.getSheetByName(name);
 if(!sh){sh=ss.insertSheet(name);sh.appendRow(SHEETS[name]);}
 return sh;
}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);}
