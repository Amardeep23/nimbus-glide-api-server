const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const dotenv = require("dotenv");
const cors = require('cors');



const app = express();
const PORT = 9000;

dotenv.config();
app.use(cors());

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const config = {
  CLUSTER: process.env.ECS_CLUSTER,
  TASK: process.env.ECS_TASK,
};

app.use(express.json());

app.post("/project", async (req, res) => {
  const { gitURL, slug } = req.body;
  console.log(gitURL);
  const projectSlug = slug ? slug : generateSlug();
  console.log(projectSlug);
  // Spin the container
  const command = new RunTaskCommand({
    cluster: config.CLUSTER, 
    taskDefinition: config.TASK, 
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-0fd0b24a5a4a4c901", 
          "subnet-01056db02ebd76f0c", 
          "subnet-044fc50d77e4dc3a0", 
        ],
        securityGroups: ["sg-0519222890fb7f71f"], 
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder-image", 
          environment: [
            { name: "GIT_REPOSITORY__URL", value: gitURL },
            { name: "PROJECT_ID", value: projectSlug },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});


app.listen(PORT, () => console.log(`API Server Running on PORT: ${PORT}`));
