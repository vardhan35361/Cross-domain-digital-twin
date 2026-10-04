pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

    environment {
        COMPOSE_PROJECT_NAME = 'hyderabad-digital-twin'
        API_URL = 'http://localhost:8001'

        PYTHON = 'C:\\Users\\admin\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
        DOCKER = 'C:\\Users\\admin\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        NODE = 'C:\\Program Files\\nodejs\\node.exe'
        NPM = 'C:\\Program Files\\nodejs\\npm.cmd'
    }

    stages {

        stage('Environment Check') {
            steps {
                bat '''
                    echo ==============================
                    echo ENVIRONMENT CHECK
                    echo ==============================

                    "%PYTHON%" --version
                    "%DOCKER%" --version
                    "%DOCKER%" compose version
                    "%NODE%" --version
                    "%NPM%" --version

                    echo ==============================
                    echo ENVIRONMENT OK
                    echo ==============================
                '''
            }
        }

        stage('Install Dependencies') {
            parallel {

                stage('Python') {
                    steps {
                        bat '''
                            "%PYTHON%" -m pip install -r backend\\requirements.txt
                        '''
                    }
                }

                stage('Node') {
                    steps {
                        bat '''
                            "%NPM%" install
                            cd frontend
                            "%NPM%" install
                        '''
                    }
                }
            }
        }

        stage('Static Analysis') {
            parallel {

                stage('Python lint') {
                    steps {
                        bat '''
                            "%PYTHON%" -m py_compile backend\\server.py backend\\twins.py backend\\auth.py
                        '''
                    }
                }

                stage('Python compileall') {
                    steps {
                        bat '''
                            "%PYTHON%" -m compileall -q backend
                        '''
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                bat '''
                    "%PYTHON%" -m pytest -q tests
                '''
            }
        }

        stage('Domain Simulation Tests') {
            steps {
                bat '''
                    "%PYTHON%" backend\\tests\\domain_simulation_test.py
                '''
            }
        }

        stage('Operator Action Tests') {
            steps {
                bat '''
                    "%PYTHON%" backend\\tests\\operator_action_test.py
                '''
            }
        }

        stage('WebSocket + Replay Tests') {
            steps {
                bat '''
                    "%PYTHON%" backend\\tests\\websocket_replay_test.py
                '''
            }
        }

        stage('Frontend Build') {
            steps {
                bat '''
                    cd frontend
                    "%NPM%" run build
                '''
            }
        }

        stage('Docker Compose Validation') {
            steps {
                bat '''
                    "%DOCKER%" compose config -q
                '''
            }
        }

        stage('Docker Build') {
            parallel {

                stage('Backend image') {
                    steps {
                        bat '''
                            "%DOCKER%" build -t hyd-twin-backend:%BUILD_NUMBER% backend
                        '''
                    }
                }

                stage('Frontend image') {
                    steps {
                        bat '''
                            "%DOCKER%" build -t hyd-twin-frontend:%BUILD_NUMBER% frontend
                        '''
                    }
                }
            }
        }

        stage('Deploy Stack') {
            steps {
                bat '''
                    "%DOCKER%" compose up -d --build
                '''
            }
        }

        stage('Wait for Health') {
            steps {
                bat '''
                    powershell -NoProfile -Command ^
                    "$ok=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%API_URL%/api/health' -TimeoutSec 5; if($r.StatusCode -eq 200){$ok=$true; break} } catch {}; Start-Sleep -Seconds 3 }; if(-not $ok){exit 1}"

                    curl.exe -fsS %API_URL%/api/domains
                '''
            }
        }

        stage('Cross-Domain Smoke Tests') {
            steps {
                bat '''
                    curl.exe -fsS %API_URL%/api/twins/traffic > NUL
                    curl.exe -fsS %API_URL%/api/twins/hospital > NUL
                    curl.exe -fsS %API_URL%/api/twins/building > NUL
                    curl.exe -fsS %API_URL%/api/twins/industrial > NUL
                    curl.exe -fsS %API_URL%/api/twins/energy > NUL
                    curl.exe -fsS %API_URL%/api/twins/water > NUL

                    curl.exe -fsS "%API_URL%/api/twins/hospital/history?minutes=1" > NUL
                    curl.exe -fsS "%API_URL%/api/twins/building/history?minutes=1" > NUL
                    curl.exe -fsS "%API_URL%/api/twins/industrial/history?minutes=1" > NUL
                    curl.exe -fsS "%API_URL%/api/twins/energy/history?minutes=1" > NUL
                    curl.exe -fsS "%API_URL%/api/twins/water/history?minutes=1" > NUL
                '''
            }
        }

        stage('Grafana + Prometheus') {
            steps {
                bat '''
                    curl.exe -fsS http://localhost:9090/-/ready
                    curl.exe -fsS http://admin:hyderabad2026@localhost:3001/api/health
                    curl.exe -fsS "http://admin:hyderabad2026@localhost:3001/api/search?type=dash-db"
                '''
            }
        }

        stage('Persistence / Restart') {
            steps {
                bat '''
                    "%DOCKER%" compose restart backend

                    powershell -NoProfile -Command ^
                    "$ok=$false; for($i=0;$i -lt 20;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri '%API_URL%/api/health' -TimeoutSec 5; if($r.StatusCode -eq 200){$ok=$true; break} } catch {}; Start-Sleep -Seconds 3 }; if(-not $ok){exit 1}"

                    curl.exe -fsS %API_URL%/api/twins/hospital
                '''
            }
        }

        stage('Post-Deploy Smoke') {
            steps {
                bat '''
                    curl.exe -fsS %API_URL%/api/overview > NUL
                    curl.exe -fsS %API_URL%/api/predictions > NUL
                    curl.exe -fsS %API_URL%/api/metrics
                '''
            }
        }
    }

    post {

        success {
            archiveArtifacts artifacts: 'frontend/build/**,backend/**/*.py',
                             allowEmptyArchive: true

            echo '=========================================='
            echo 'HYDERABAD DIGITAL TWIN CI/CD PASSED'
            echo '=========================================='
        }

        failure {
            bat '''
                "%DOCKER%" compose logs || exit 0
            '''

            bat '''
                "%DOCKER%" compose down
            '''

            echo 'Pipeline failed - stack torn down'
        }

        always {
            junit allowEmptyResults: true,
                  testResults: 'test-results/*.xml'
        }
    }
}
