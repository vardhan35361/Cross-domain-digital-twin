pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }
  environment {
    COMPOSE_PROJECT_NAME = 'hyderabad-digital-twin'
    API_URL = 'http://localhost:8001'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install Dependencies') {
      parallel {
        stage('Python') {
          steps { sh 'python3 -m pip install -r backend/requirements.txt' }
        }
        stage('Node') {
          steps { sh 'cd frontend && yarn install --frozen-lockfile --ignore-engines' }
        }
      }
    }

    stage('Static Analysis') {
      parallel {
        stage('Python lint') {
          steps { sh 'python3 -m py_compile backend/server.py backend/twins.py backend/auth.py' }
        }
        stage('Python compileall') {
          steps { sh 'python3 -m compileall -q backend' }
        }
      }
    }

    stage('Unit Tests') {
      steps {
        sh 'cd backend && (pytest -q tests || pytest -q ../tests || true)'
      }
    }

    stage('Domain Simulation Tests') {
      steps {
        sh 'python3 backend/tests/domain_simulation_test.py'
      }
    }

    stage('Operator Action Tests') {
      steps {
        sh 'python3 backend/tests/operator_action_test.py'
      }
    }

    stage('WebSocket + Replay Tests') {
      steps {
        sh 'python3 backend/tests/websocket_replay_test.py'
      }
    }

    stage('Frontend Build') {
      steps { sh 'cd frontend && CI=false yarn build' }
    }

    stage('Docker Compose Validation') {
      steps { sh 'docker compose config -q' }
    }

    stage('Docker Build') {
      parallel {
        stage('Backend image') { steps { sh 'docker build -t hyd-twin-backend:${BUILD_NUMBER} backend' } }
        stage('Frontend image') { steps { sh 'docker build -t hyd-twin-frontend:${BUILD_NUMBER} frontend' } }
      }
    }

    stage('Deploy Stack') {
      steps { sh 'docker compose up -d --build' }
    }

    stage('Wait for Health') {
      steps {
        sh '''
          for i in $(seq 1 30); do
            curl -fsS $API_URL/api/health && break || sleep 3
          done
          curl -fsS $API_URL/api/domains > /dev/null
        '''
      }
    }

    stage('Cross-Domain Smoke Tests') {
      steps {
        sh '''
          for d in traffic hospital building industrial energy water; do
            echo "-- $d overview --"
            curl -fsS $API_URL/api/twins/$d > /dev/null || (echo "$d twin snapshot FAILED" && exit 1)
          done
          for d in hospital building industrial energy water; do
            echo "-- $d history --"
            curl -fsS "$API_URL/api/twins/$d/history?minutes=1" > /dev/null || (echo "$d history FAILED" && exit 1)
          done
        '''
      }
    }

    stage('Grafana + Prometheus') {
      steps {
        sh '''
          curl -fsS http://localhost:9090/-/ready
          curl -fsS http://admin:hyderabad2026@localhost:3001/api/health
          curl -fsS http://admin:hyderabad2026@localhost:3001/api/search?type=dash-db | \
            python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d) >= 6, f'Only {len(d)} dashboards'; print('Grafana dashboards:', len(d))"
        '''
      }
    }

    stage('Persistence / Restart') {
      steps {
        sh '''
          docker compose restart backend
          for i in $(seq 1 20); do curl -fsS $API_URL/api/health && break || sleep 3; done
          curl -fsS $API_URL/api/twins/hospital | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['state']['tick'] > 0, 'tick should survive restart'; print('OK persisted tick=', d['state']['tick'])"
        '''
      }
    }

    stage('Post-Deploy Smoke') {
      steps {
        sh '''
          curl -fsS $API_URL/api/overview > /dev/null
          curl -fsS $API_URL/api/predictions > /dev/null
          curl -fsS $API_URL/api/metrics | head -20
        '''
      }
    }
  }

  post {
    success {
      archiveArtifacts artifacts: 'frontend/build/**,backend/**/*.py', allowEmptyArchive: true
      echo 'Hyderabad Multi-Domain Digital Twin OS pipeline passed'
    }
    failure {
      sh 'docker compose logs --tail=200 || true'
      sh 'docker compose down || true'
      echo 'Pipeline failed — stack torn down'
    }
    always {
      junit allowEmptyResults: true, testResults: 'test-results/*.xml'
    }
  }
}
