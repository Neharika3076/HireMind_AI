const asList = (value) => Array.isArray(value) ? value : [];
const skill = (name, required) => ({ name: String(name), required });
const clean = (value) => String(value || "").trim();
const key = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const mergeUnique = (items, itemKey = key) => {
  const seen = new Set();
  return items.filter((item) => {
    const value = itemKey(item);
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

/**
 * Build the matcher input from the saved job. Explicit fields entered in the
 * job form are retained, while the AI-analyzed profile fills missing details
 * and adds requirements supported by the description.
 */
export function buildAtsJobProfile(job) {
  const analyzed = job.aiJobProfile || {};
  const analyzedSkills = asList(analyzed.skills);
  const explicitRequired = asList(job.requiredSkills).map((name) => skill(name, true));
  const explicitPreferred = asList(job.preferredSkills).map((name) => skill(name, false));
  const explicitSkillKeys = new Set([...explicitRequired, ...explicitPreferred].map((item) => key(item.name)));
  const inferredRequired = analyzedSkills.filter((item) => item.required !== false && !explicitSkillKeys.has(key(item.name)));
  const inferredPreferred = analyzedSkills.filter((item) => item.required === false && !explicitSkillKeys.has(key(item.name)));
  const requiredSkills = mergeUnique([...explicitRequired, ...inferredRequired], (item) => key(item.name));
  const preferredSkills = mergeUnique([...explicitPreferred, ...inferredPreferred], (item) => key(item.name));
  const structuredEducation = asList(job.educationRequirements)
    .map((requirement) => String(requirement).trim())
    .filter(Boolean)
    .map((degree) => ({ degree, field: null, required: true }));
  const analyzedExperience = analyzed.experience || {};
  const minimumYears = Number(job.minimumExperience || 0);
  const preferredYears = Number(job.preferredExperience || 0);
  const structuredResponsibilities = asList(job.responsibilities);
  const structuredCertifications = asList(job.certifications);
  const analyzedEducation = asList(analyzed.education);
  const education = mergeUnique([...structuredEducation, ...analyzedEducation], (item) => key(`${item.degree || ""} ${item.field || ""}`));
  const responsibilities = mergeUnique([...structuredResponsibilities, ...asList(analyzed.responsibilities)], (item) => key(item));
  const certifications = mergeUnique([
    ...structuredCertifications.map((name) => ({ name, required: false })),
    ...asList(analyzed.certifications)
  ], (item) => key(item.name));

  return {
    ...analyzed,
    title: job.title || analyzed.title || null,
    company: job.companyName || analyzed.company || null,
    summary: job.description || analyzed.summary || null,
    skills: [...requiredSkills, ...preferredSkills],
    experience: {
      ...analyzedExperience,
      minimum_years: minimumYears > 0 ? minimumYears : analyzedExperience.minimum_years ?? null,
      preferred_years: preferredYears > 0 ? preferredYears : analyzedExperience.preferred_years ?? null,
    },
    education,
    responsibilities,
    certifications,
  };
}
