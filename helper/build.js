export function countBuildFormFilled(project, slug) {
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
  let basicProgress = (basicCountFilled / basicTotal) * 100;

  let storyCountFilled = 0;
  let storyTotal = 0;
  for (const prop in story) {
    storyTotal++;
    if (story[prop] && story[prop].length > 0) {
      storyCountFilled++;
    }
  }
  let storyProgress = (storyCountFilled / storyTotal) * 100;

  let profileCountFilled = 0;
  let profileTotal = 0;
  for (const prop in profile) {
    profileTotal++;
    if (profile[prop]) {
      profileCountFilled++;
    }
  }
  let profileProgress = (profileCountFilled / profileTotal) * 100;

  let paymentCountFilled = 0;
  let paymentTotal = 0;
  for (const prop in payment) {
    paymentTotal++;
    if (payment[prop]) {
      paymentCountFilled++;
    }
  }
  let paymentProgress = (paymentCountFilled / paymentTotal) * 100;

  return { basicProgress, storyProgress, profileProgress, paymentProgress };
}

export function isBuildCompleted(project, slug) {
  const { basicProgress, storyProgress, profileProgress, paymentProgress } =
    countBuildFormFilled(project, slug);

  if (
    basicProgress !== 100 ||
    storyProgress !== 100 ||
    profileProgress !== 100 ||
    paymentProgress !== 100
  ) {
    return false;
  }

  return true;
}
