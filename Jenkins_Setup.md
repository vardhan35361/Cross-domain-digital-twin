# Jenkins Setup

1. Create a Pipeline job pointing to this repository.
2. Add a GitHub webhook for push events and enable the GitHub hook trigger.
3. Ensure the agent has Docker, Python 3.11, Node 20, Yarn, and Compose.
4. Run the pipeline; the `Jenkinsfile` performs validation, builds, smoke tests, archives, and removes failed Compose deployments.
5. Store any production credentials in Jenkins Credentials, never in source control. The checked-in demo uses the existing workspace environment contract.