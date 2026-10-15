const asList = (value) => Array.isArray(value) ? value : [];
const skill = (name, required) => ({ name: String(name), required });

/**
 * Build the matcher input from the saved job. Explicit fields entered in the
 * job form win; the AI-analyzed profile fills only fields the form left empty.
 */
export function buildAtsJobProfile(job) {
  const analyzed = job.aiJobProfile || {};
  const analyzedSkills = asList(analyzed.skills);
  const requiredSkills = asList(job.requiredSkills).length
    ? asList(job.requiredSkills).map((name) => skill(name, true))
    : analyzedSkills.filter((item) => item.required !== false);
  const preferredSkills = asList(job.preferredSkills).length
    ? asList(job.preferredSkills).map((name) => skill(name, false))
    : analyzedSkills.filter((item) => item.required === false);
  const structuredEducation = asList(job.educationRequirements)
    .map((requirement) => String(requirement).trim())
    .filter(Boolean)
    .map((degree) => ({ degree, field: null, required: true }));
  const analyzedExperience = analyzed.experience || {};
  const minimumYears = Number(job.minimumExperience || 0);
  const preferredYears = Number(job.preferredExperience || 0);
  const structuredResponsibilities = asList(job.responsibilities);
  const structuredCertifications = asList(job.certifications);

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
    education: structuredEducation.length ? structuredEducation : asList(analyzed.education),
    responsibilities: structuredResponsibilities.length ? structuredResponsibilities : asList(analyzed.responsibilities),
    certifications: structuredCertifications.length
      ? structuredCertifications.map((name) => ({ name, required: false }))
      : asList(analyzed.certifications),
  };
}
