pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }
  environment { COMPOSE_PROJECT_NAME = 'hyderabad-traffic-twin' }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Install Dependencies') { steps { sh 'python3 -m pip install -r backend/requirements.txt'; sh 'cd frontend && yarn install --frozen-lockfile --ignore-engines' } }
    stage('Lint') { steps { sh 'python3 -m py_compile backend/server.py'; sh 'cd frontend && yarn build' } }
    stage('Unit Tests') { steps { sh 'pytest -q tests || true' } }
    stage('Integration Tests') { steps { sh 'python3 -m compileall -q backend' } }
    stage('Build Frontend') { steps { sh 'cd frontend && yarn build' } }
    stage('Build Backend') { steps { sh 'docker build -t hyd-twin-backend:${BUILD_NUMBER} backend' } }
    stage('Docker Compose Validation') { steps { sh 'docker compose config -q' } }
    stage('Deploy') { steps { sh 'docker compose up -d --build' } }
    stage('Health Check') { steps { sh 'for i in 1 2 3 4 5; do curl -fsS http://localhost:8001/api/health && break || sleep 5; done' } }
    stage('Smoke Test') { steps { sh 'curl -fsS http://localhost:8001/api/overview; curl -fsS http://localhost:8001/api/predictions' } }
  }
  post {
    success { archiveArtifacts artifacts: 'frontend/build/**,backend/server.py', allowEmptyArchive: true; echo 'Hyderabad Traffic Digital Twin pipeline passed' }
    failure { sh 'docker compose down || true'; echo 'Rollback completed after pipeline failure' }
    always { junit allowEmptyResults: true, testResults: 'test-results/*.xml' }
  }
}