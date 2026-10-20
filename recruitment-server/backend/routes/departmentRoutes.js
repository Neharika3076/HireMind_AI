const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
function requireAdmin(req,res,next){ if(req.user.role!=='admin') return res.status(403).json({success:false,message:'Administrator access required.'}); next(); }
router.get('/', requireAuth, async (req,res)=>{
 try {
  const filter = { organization: req.user.organization };
  const departments = await Department.find(filter).sort({name:1}).lean();
  const counts = await User.aggregate([{ $match:{organization: require('mongoose').Types.ObjectId.createFromHexString(String(req.user.organization))} },{$group:{_id:'$department',count:{$sum:1}}}]);
  const countMap = new Map(counts.map(x=>[String(x._id),x.count]));
  res.json({success:true,departments:departments.map(d=>({...d,memberCount:countMap.get(String(d._id))||0}))});
 } catch(e){ console.error('Departments list:',e); res.status(500).json({success:false,message:'Unable to load departments.'}); }
});
router.post('/', requireAuth, requireAdmin, async(req,res)=>{
 try {
  const name = typeof req.body.name==='string' ? req.body.name.trim() : '';
  const description = typeof req.body.description==='string' ? req.body.description.trim() : '';
  if(!name) return res.status(400).json({success:false,message:'Department name is required.'});
  const department = await Department.create({name,description,organization:req.user.organization,createdBy:req.user.userId});
  res.status(201).json({success:true,message:'Department created.',department});
 } catch(e){ if(e.code===11000) return res.status(409).json({success:false,message:'This department already exists.'}); console.error('Create department:',e); res.status(500).json({success:false,message:'Unable to create department.'}); }
});
module.exports=router;
