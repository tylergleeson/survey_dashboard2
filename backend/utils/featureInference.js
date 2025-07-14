// Feature inference algorithm based on user demographics
const inferUserCharacteristics = (age, occupation, location) => {
  const occupationLower = occupation.toLowerCase();
  const locationLower = location.toLowerCase();
  
  // Income level inference
  const calculateIncome = () => {
    const techRoles = ['software', 'engineer', 'developer', 'programmer', 'data scientist', 'product manager'];
    const executiveRoles = ['ceo', 'cto', 'cfo', 'director', 'vp', 'vice president', 'president'];
    const professionalRoles = ['doctor', 'lawyer', 'consultant', 'analyst', 'manager'];
    const serviceRoles = ['teacher', 'nurse', 'social worker', 'retail', 'server', 'cashier'];
    
    let baseIncome = 40000; // Default
    
    if (executiveRoles.some(role => occupationLower.includes(role))) {
      baseIncome = 150000;
    } else if (techRoles.some(role => occupationLower.includes(role))) {
      baseIncome = 85000;
    } else if (professionalRoles.some(role => occupationLower.includes(role))) {
      baseIncome = 65000;
    } else if (serviceRoles.some(role => occupationLower.includes(role))) {
      baseIncome = 35000;
    }
    
    // Age adjustment
    if (age < 25) baseIncome *= 0.7;
    else if (age > 40) baseIncome *= 1.2;
    
    // Location adjustment (major tech hubs)
    const highCostAreas = ['san francisco', 'new york', 'seattle', 'boston', 'los angeles'];
    if (highCostAreas.some(area => locationLower.includes(area))) {
      baseIncome *= 1.4;
    }
    
    if (baseIncome < 30000) return 'low';
    if (baseIncome < 60000) return 'lower-middle';
    if (baseIncome < 100000) return 'middle';
    if (baseIncome < 200000) return 'upper-middle';
    return 'high';
  };
  
  // Education level inference
  const inferEducation = () => {
    const doctoralRoles = ['doctor', 'professor', 'researcher', 'phd'];
    const professionalRoles = ['lawyer', 'engineer', 'analyst', 'consultant', 'manager'];
    const techRoles = ['software', 'developer', 'programmer', 'data scientist'];
    const tradeRoles = ['electrician', 'plumber', 'mechanic', 'construction'];
    
    if (doctoralRoles.some(role => occupationLower.includes(role))) return 'doctoral';
    if (professionalRoles.some(role => occupationLower.includes(role))) return 'masters';
    if (techRoles.some(role => occupationLower.includes(role))) return 'bachelors';
    if (tradeRoles.some(role => occupationLower.includes(role))) return 'trade-school';
    
    // Age-based fallback
    if (age > 25) return 'bachelors';
    return 'some-college';
  };
  
  // Housing situation inference
  const inferHousing = (income) => {
    const incomeLevel = calculateIncome();
    
    if (age < 25) return 'renting-shared';
    if (age < 30 && incomeLevel === 'low') return 'renting-alone';
    if (age > 35 && ['upper-middle', 'high'].includes(incomeLevel)) return 'owned-house';
    if (['middle', 'upper-middle'].includes(incomeLevel)) return 'owned-condo';
    return 'renting-alone';
  };
  
  // Family status inference
  const inferFamily = () => {
    if (age < 25) return 'single';
    if (age < 30) return 'single-dating';
    if (age < 35) return 'married-no-kids';
    if (age < 45) return 'married-young-kids';
    if (age < 55) return 'married-teen-kids';
    return 'empty-nest';
  };
  
  // Tech adoption inference
  const inferTechLevel = () => {
    const techRoles = ['software', 'engineer', 'developer', 'it', 'tech', 'digital'];
    
    if (techRoles.some(role => occupationLower.includes(role))) return 'early-adopter';
    if (age < 30) return 'digital-native';
    if (age < 45) return 'mainstream';
    if (age < 60) return 'late-adopter';
    return 'traditional';
  };
  
  // Political leaning inference (general trends, not individual)
  const inferPolitics = () => {
    const liberalCities = ['san francisco', 'berkeley', 'portland', 'seattle', 'boston', 'new york'];
    const conservativeStates = ['texas', 'florida', 'alabama', 'mississippi', 'utah'];
    const techRoles = ['software', 'engineer', 'developer', 'designer'];
    const traditionalRoles = ['police', 'military', 'construction', 'farming'];
    
    let score = 0; // -2 to +2, negative = conservative, positive = liberal
    
    if (liberalCities.some(city => locationLower.includes(city))) score += 1;
    if (conservativeStates.some(state => locationLower.includes(state))) score -= 1;
    if (techRoles.some(role => occupationLower.includes(role))) score += 1;
    if (traditionalRoles.some(role => occupationLower.includes(role))) score -= 1;
    if (age < 30) score += 0.5;
    if (age > 50) score -= 0.5;
    
    if (score <= -1) return 'conservative';
    if (score >= 1) return 'liberal';
    return 'moderate';
  };
  
  // Media consumption inference
  const inferMedia = (techLevel, age) => {
    const tech = inferTechLevel();
    
    if (tech === 'early-adopter') return 'digital-first';
    if (age < 30) return 'social-media-heavy';
    if (age < 45) return 'mixed-traditional-digital';
    if (age < 60) return 'traditional-with-digital';
    return 'traditional-media';
  };
  
  return {
    incomeLevel: calculateIncome(),
    educationLevel: inferEducation(),
    housingSituation: inferHousing(),
    familyStatus: inferFamily(),
    techAdoption: inferTechLevel(),
    politicalLeaning: inferPolitics(),
    mediaConsumption: inferMedia()
  };
};

// Calculate demographic bonuses for surveys
const calculateDemographicBonus = (userData, surveyRequirements) => {
  if (!surveyRequirements || !surveyRequirements.demographics) {
    return 0;
  }
  
  let bonus = 0;
  const demographics = surveyRequirements.demographics;
  
  // Income level bonuses
  if (demographics.incomeLevel && userData.income_level === demographics.incomeLevel) {
    bonus += demographics.incomeBonus || 2.00;
  }
  
  // Age range bonuses
  if (demographics.ageRange) {
    const [minAge, maxAge] = demographics.ageRange;
    if (userData.age >= minAge && userData.age <= maxAge) {
      bonus += demographics.ageBonus || 1.50;
    }
  }
  
  // Occupation bonuses
  if (demographics.occupation && userData.occupation.toLowerCase().includes(demographics.occupation.toLowerCase())) {
    bonus += demographics.occupationBonus || 3.00;
  }
  
  // Location bonuses
  if (demographics.location && userData.location.toLowerCase().includes(demographics.location.toLowerCase())) {
    bonus += demographics.locationBonus || 1.00;
  }
  
  // Education level bonuses
  if (demographics.education && userData.education_level === demographics.education) {
    bonus += demographics.educationBonus || 2.50;
  }
  
  return Math.min(bonus, 10.00); // Cap at $10 bonus
};

// Quality multiplier calculation
const calculateQualityMultiplier = (qualityScores) => {
  const overallQuality = (
    qualityScores.richness + 
    qualityScores.emotion + 
    qualityScores.insight + 
    qualityScores.clarity
  ) / 4;
  
  if (overallQuality >= 4.5) return 1.0;
  if (overallQuality >= 4.0) return 0.9;
  if (overallQuality >= 3.5) return 0.8;
  if (overallQuality >= 3.0) return 0.7;
  return 0.6;
};

// Tier multiplier calculation
const calculateTierMultiplier = (userTier) => {
  switch (userTier) {
    case 'elite': return 1.25;
    case 'pro': return 1.15;
    case 'basic': return 1.0;
    default: return 1.0;
  }
};

// Main payment calculation function
const calculatePayment = (baseRate, qualityScores, userTier, userData, surveyRequirements) => {
  const qualityMultiplier = calculateQualityMultiplier(qualityScores);
  const tierMultiplier = calculateTierMultiplier(userTier);
  const demographicBonus = calculateDemographicBonus(userData, surveyRequirements);
  
  return (baseRate * qualityMultiplier * tierMultiplier) + demographicBonus;
};

module.exports = {
  inferUserCharacteristics,
  calculateDemographicBonus,
  calculateQualityMultiplier,
  calculateTierMultiplier,
  calculatePayment
};