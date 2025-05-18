export function isBuildCompleted(project, slug) {
  const story = project.story.toObject();
  const oldBasic = project.basic.toObject();
  const payment = project.payment.toObject();
  const profile = { slug: slug, biography: project.creator.biography };

  const {
    title,
    subTitle,
    category,
    location,
    imageUrl,
    fundTarget,
    duration,
  } = oldBasic;

  const basic = {
    title,
    subTitle,
    category,
    location,
    imageUrl,
    fundTarget,
    duration,
  };

  let basicCountFilled = 0;
  let basicTotal = 0;
  for (const prop in basic) {
    basicTotal++;
    if (basic[prop]) {
      basicCountFilled++;
    }
  }
  if (basicCountFilled !== basicTotal) {
    return false;
  }

  let storyCountFilled = 0;
  let storyTotal = 0;
  for (const prop in story) {
    storyTotal++;
    if (story[prop] && story[prop].length > 0) {
      storyCountFilled++;
    }
  }
  if (storyCountFilled !== storyTotal) {
    return false;
  }

  let profileCountFilled = 0;
  let profileTotal = 0;
  for (const prop in profile) {
    profileTotal++;
    if (profile[prop]) {
      profileCountFilled++;
    }
  }
  if (profileCountFilled !== profileTotal) {
    return false;
  }

  let paymentCountFilled = 0;
  let paymentTotal = 0;
  for (const prop in payment) {
    paymentTotal++;
    if (payment[prop]) {
      paymentCountFilled++;
    }
  }
  if (paymentCountFilled !== paymentTotal) {
    return false;
  }

  return true;
}
