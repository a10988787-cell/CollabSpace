router.post("/brand/campaigns", (req, res) => {

  const campaign = {
    id: Date.now(),
    title: req.body.title,
    description: req.body.description,
    budget: req.body.budget,
    slots: req.body.slots,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    niche: req.body.niche,
    status: req.body.status,
    platforms: req.body.platforms,
    requirements: req.body.requirements
  };

  console.log("New Campaign:", campaign);

  res.status(201).json({
    message: "Campaign created successfully",
    campaign
  });
});