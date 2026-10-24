const express = require('express');
const Department = require('../models/Department');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { referenceId, visibleDirectoryMembers } = require('../services/directory-access');
const router = express.Router();
function requireAdmin(req,res,next){ if(req.user.role!=='admin') return res.status(403).json({success:false,message:'Administrator access required.'}); next(); }
router.get('/', requireAuth, async (req,res)=>{
 try {
  if (!req.user.organization) return res.status(403).json({success:false,message:'Your account is not assigned to an organization.'});
  const organizationUsers = await User.find({ organization: req.user.organization })
    .select('_id role department manager')
    .lean();
  const visibleUsers = visibleDirectoryMembers(organizationUsers, req.user);
  if (!visibleUsers) {
   // Keep the existing department-list API available for authenticated roles
   // that use it for non-directory features (for example task filters).
   const departments = await Department.find({ organization: req.user.organization }).sort({name:1}).lean();
   const counts = await User.aggregate([
    { $match: { organization: require('mongoose').Types.ObjectId.createFromHexString(String(req.user.organization)) } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
   ]);
   const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
   return res.json({success:true,departments:departments.map((item)=>({...item,memberCount:countMap.get(String(item._id))||0}))});
  }

  const departmentIds = new Set(visibleUsers.map((user) => referenceId(user.department)).filter(Boolean));
  if (req.user.role === 'admin') {
   const departments = await Department.find({ organization: req.user.organization }).sort({name:1}).lean();
   const countMap = new Map();
   for (const user of visibleUsers) {
    const id = referenceId(user.department);
    if (id) countMap.set(id, (countMap.get(id) || 0) + 1);
   }
   return res.json({success:true,departments:departments.map(d=>({...d,memberCount:countMap.get(String(d._id))||0}))});
  }

  // An executive can see the department they lead even before its first
  // report is added; managers only see departments represented by their team.
  if (['executive', 'recruiter'].includes(req.user.role) && req.user.department) {
   departmentIds.add(referenceId(req.user.department));
  }
  const departments = departmentIds.size
   ? await Department.find({ organization: req.user.organization, _id: { $in: [...departmentIds] } }).sort({name:1}).lean()
   : [];
  const countMap = new Map();
  for (const user of visibleUsers) {
   const id = referenceId(user.department);
   if (id) countMap.set(id, (countMap.get(id) || 0) + 1);
  }
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
