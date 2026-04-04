import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Container,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
  LinearProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Skeleton,
} from "@mui/material";
import { CloudUpload, CheckCircle, School } from "lucide-react";
import { apiClient } from "../services/api";

function AIDashboard() {
  const [tabValue, setTabValue] = useState(0);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Summary popup state
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryDialogData, setSummaryDialogData] = useState(null);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/study/sessions");
      setSessions(res.data.sessions);
      if (res.data.sessions.length > 0 && !currentSession) {
        setCurrentSession(res.data.sessions[0]);
      } else if (currentSession) {
        const stillExists = res.data.sessions.find(s => s._id === currentSession._id);
        if (!stillExists && res.data.sessions.length > 0) {
          setCurrentSession(res.data.sessions[0]);
        }
      }
      setError(null);
    } catch (err) {
      setError("Failed to load study sessions. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Helper to update both sessions list and current session
  const updateSessionInState = (updatedSession) => {
    setSessions(prev =>
      prev.map(s => (s._id === updatedSession._id ? updatedSession : s))
    );
    setCurrentSession(updatedSession);
  };

  // Handle click on a session card: set current session and open summary popup if summary exists
  const handleSessionClick = (session) => {
    setCurrentSession(session);
    if (session.summary && session.summary.aiGenerated) {
      setSummaryDialogData(session.summary);
      setSummaryDialogOpen(true);
    } else {
      // Open popup with a message that no summary exists, and offer to generate
      setSummaryDialogData(null);
      setSummaryDialogOpen(true);
    }
  };

  // Generate summary (also used inside the popup)
  const handleGenerateSummary = async () => {
    if (!currentSession?._id) {
      setError("Please select a study session first");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post(`/study/${currentSession._id}/summary`, {});
      const summary = res.data.summary;
      setDialogTitle("📚 Study Summary");
      setDialogContent(`${summary.aiGenerated}\n\nKey Points:\n• ${summary.keyPoints.join("\n• ")}`);
      setOpenDialog(true);
      // Update local state
      const updatedSession = { ...currentSession, summary };
      updateSessionInState(updatedSession);
      // If the summary popup is open, refresh its content
      if (summaryDialogOpen) {
        setSummaryDialogData(summary);
      }
    } catch (err) {
      setError("Failed to generate summary: " + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // Generate practice questions
  const handleGenerateQuestions = async () => {
    if (!currentSession?._id) {
      setError("Please select a study session first");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post(`/study/${currentSession._id}/questions`, {
        numQuestions: 5,
        difficulty: "intermediate",
      });
      const updatedSession = { ...currentSession, practiceQuestions: res.data.questions };
      updateSessionInState(updatedSession);
      setTabValue(2);
      setError(null);
    } catch (err) {
      setError("Failed to generate questions: " + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // Generate learning path
  const handleGenerateLearningPath = async () => {
    if (!currentSession?._id) {
      setError("Please select a study session first");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiClient.post(`/study/${currentSession._id}/learning-path`, {});
      const updatedSession = { ...currentSession, learningPath: res.data.learningPath };
      updateSessionInState(updatedSession);
      setTabValue(3);
      setError(null);
    } catch (err) {
      setError("Failed to generate learning path: " + (err.response?.data?.error || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // Submit answer to a practice question
  const handleSubmitAnswer = async (questionId, answer) => {
    try {
      const res = await apiClient.post("/study/submit-answer", {
        sessionId: currentSession._id,
        questionId,
        userAnswer: answer,
      });

      const updatedQuestions = currentSession.practiceQuestions.map(q =>
        q._id === questionId
          ? { ...q, userAnswer: answer, isCorrect: res.data.isCorrect }
          : q
      );
      const updatedSession = {
        ...currentSession,
        progress: res.data.progress,
        practiceQuestions: updatedQuestions,
      };
      updateSessionInState(updatedSession);

      setDialogTitle(res.data.isCorrect ? "✅ Correct!" : "❌ Incorrect");
      setDialogContent(`Explanation: ${res.data.explanation}\nCorrect Answer: ${res.data.correctAnswer}`);
      setOpenDialog(true);
    } catch (err) {
      setError("Failed to submit answer: " + (err.response?.data?.error || err.message));
    }
  };

  // Mark learning path step as completed
  const handleStepProgress = async (stepNumber) => {
    try {
      const res = await apiClient.put(`/study/${currentSession._id}/progress`, { stepNumber });
      const updatedSession = { ...currentSession, learningPath: res.data.learningPath };
      updateSessionInState(updatedSession);
    } catch (err) {
      setError("Failed to update progress: " + (err.response?.data?.error || err.message));
    }
  };

  // File upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadingFile(true);
    const formData = new FormData();
    formData.append("file", file);
    if (currentSession?._id) {
      formData.append("sessionId", currentSession._id);
    }

    try {
      const res = await apiClient.post("/study/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateSessionInState(res.data.studySession);
      setError(null);
    } catch (err) {
      setError("Failed to upload file: " + (err.response?.data?.error || err.message));
    } finally {
      setUploadingFile(false);
      setSelectedFile(null);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading study sessions...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        🎓 Intelligent Study Companion
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="📁 My Sessions" />
          <Tab label="📝 Upload & Summarize" />
          <Tab label="❓ Practice Questions" />
          <Tab label="🛣️ Learning Path" />
          <Tab label="📊 Progress Stats" />
        </Tabs>
      </Paper>

      {/* ========== TAB 0: MY SESSIONS ========== */}
      {tabValue === 0 && (
        <Box>
          {sessions.length === 0 ? (
            <Card sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="h6" color="textSecondary">
                No study sessions yet
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Upload a file or create a session to get started.
              </Typography>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {sessions.map((session) => (
                <Grid item xs={12} sm={6} md={4} key={session._id}>
                  <Card
                    onClick={() => handleSessionClick(session)}
                    onKeyDown={(e) => e.key === "Enter" && handleSessionClick(session)}
                    role="button"
                    tabIndex={0}
                    sx={{
                      cursor: "pointer",
                      border: currentSession?._id === session._id ? "2px solid #1976d2" : "1px solid #e0e0e0",
                      transition: "all 0.2s",
                      "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
                      "&:focus-visible": { outline: "2px solid #1976d2" },
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="bold" noWrap title={session.title}>
                        {session.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                        {session.uploadedFile?.originalName || "No file attached"}
                      </Typography>

                      {session.content?.extractedTopics?.length > 0 && (
                        <Box sx={{ mt: 1.5, mb: 1 }}>
                          {session.content.extractedTopics.slice(0, 3).map((topic, idx) => (
                            <Chip
                              key={idx}
                              label={topic}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                          {session.content.extractedTopics.length > 3 && (
                            <Chip label={`+${session.content.extractedTopics.length - 3}`} size="small" />
                          )}
                        </Box>
                      )}

                      <Box sx={{ mt: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={session.progress?.accuracy ?? 0}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">
                            Accuracy: {(session.progress?.accuracy ?? 0).toFixed(0)}%
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {session.progress?.questionsAnswered || 0} answered
                          </Typography>
                        </Box>
                      </Box>

                      {session.learningPath?.steps?.length > 0 && (
                        <Chip
                          label={`Learning path: ${session.learningPath.progress?.toFixed(0)}%`}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      )}
                    </CardContent>
                    <CardActions sx={{ pt: 0, justifyContent: "flex-end" }}>
                      <Typography variant="caption" color="textSecondary">
                        Created: {new Date(session.createdAt).toLocaleDateString()}
                      </Typography>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ========== TAB 1: UPLOAD & SUMMARIZE ========== */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  📤 Upload Course Material
                </Typography>
                <Box
                  component="label"
                  sx={{
                    border: "2px dashed #1976d2",
                    borderRadius: 2,
                    p: 3,
                    textAlign: "center",
                    cursor: "pointer",
                    bgcolor: "#f5f5f5",
                    "&:hover": { bgcolor: "#e3f2fd" },
                  }}
                >
                  <CloudUpload size={40} color="#1976d2" />
                  <Typography mt={2}>Drag and drop your file or click to browse</Typography>
                  <Typography variant="caption" color="gray">
                    Supported: TXT, MD, CSV, JSON, JS, HTML, CSS, XML, LOG (Max 10MB)
                  </Typography>
                  <input
                    type="file"
                    hidden
                    onChange={handleFileUpload}
                    accept=".txt,.md,.csv,.json,.js,.html,.css,.xml,.log"
                  />
                </Box>
                {uploadingFile && (
                  <Box mt={2} display="flex" alignItems="center">
                    <CircularProgress size={24} sx={{ mr: 1 }} />
                    <Typography variant="body2">Uploading and processing...</Typography>
                  </Box>
                )}
                {selectedFile && !uploadingFile && (
                  <Typography variant="body2" color="green" mt={2}>
                    ✅ File uploaded: {selectedFile.name}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" mb={2}>
                  🤖 AI-Generated Summary
                </Typography>
                {currentSession?.summary ? (
                  <Box>
                    <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
                      {currentSession.summary.aiGenerated}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Key Points:
                    </Typography>
                    {currentSession.summary.keyPoints.map((point, idx) => (
                      <Typography key={idx} variant="body2">
                        • {point}
                      </Typography>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="gray">
                    Upload a file and generate a summary using Gemini AI.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={handleGenerateSummary}
                  disabled={!currentSession?.content?.rawText || generating}
                >
                  {generating ? <CircularProgress size={24} /> : "Generate Summary"}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ========== TAB 2: PRACTICE QUESTIONS ========== */}
      {tabValue === 2 && (
        <Box>
          <Button
            variant="contained"
            onClick={handleGenerateQuestions}
            disabled={!currentSession?.content?.rawText || generating}
            sx={{ mb: 2 }}
          >
            {generating ? "Generating Questions..." : "Generate Practice Questions"}
          </Button>
          {currentSession?.practiceQuestions?.length > 0 ? (
            currentSession.practiceQuestions.map((q, idx) => (
              <Card key={idx} sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="h6" mb={2}>
                    Q{idx + 1}. {q.question}
                  </Typography>
                  <Grid container spacing={1} mb={2}>
                    {(q.options || []).map((opt, optIdx) => (
                      <Grid item xs={12} sm={6} key={optIdx}>
                        <Button
                          variant={q.userAnswer === opt ? (q.isCorrect ? "contained" : "outlined") : "outlined"}
                          color={q.userAnswer === opt ? (q.isCorrect ? "success" : "error") : "primary"}
                          fullWidth
                          disabled={!!q.userAnswer}
                          onClick={() => handleSubmitAnswer(q._id, opt)}
                        >
                          {opt}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                  {q.userAnswer && (
                    <Alert severity={q.isCorrect ? "success" : "error"} sx={{ mt: 1 }}>
                      {q.explanation}
                    </Alert>
                  )}
                  <Chip label={`Difficulty: ${q.difficulty}`} size="small" sx={{ mr: 1, mt: 1 }} />
                  <Chip label={`Topic: ${q.topic}`} size="small" sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <Typography color="gray">No questions generated yet. Click the button above.</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ========== TAB 3: LEARNING PATH ========== */}
      {tabValue === 3 && (
        <Box>
          <Button
            variant="contained"
            onClick={handleGenerateLearningPath}
            disabled={!currentSession?.content?.rawText || generating}
            sx={{ mb: 2 }}
          >
            {generating ? "Generating..." : "Generate Adaptive Learning Path"}
          </Button>
          {currentSession?.learningPath?.steps?.length > 0 ? (
            <Box>
              <LinearProgress
                variant="determinate"
                value={currentSession.learningPath.progress}
                sx={{ mb: 3, height: 10, borderRadius: 5 }}
              />
              <Typography mb={2}>Overall Progress: {currentSession.learningPath.progress.toFixed(1)}%</Typography>
              {currentSession.learningPath.steps.map((step) => (
                <Card
                  key={step.step}
                  sx={{
                    mb: 2,
                    border: step.step === currentSession.learningPath.currentStep ? "2px solid #1976d2" : "none",
                    bgcolor: currentSession.learningPath.completedSteps.includes(step.step) ? "#f1f8e9" : "white",
                  }}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={1}>
                      {currentSession.learningPath.completedSteps.includes(step.step) ? (
                        <CheckCircle size={24} color="green" style={{ marginRight: 8 }} />
                      ) : (
                        <School size={24} color="#1976d2" style={{ marginRight: 8 }} />
                      )}
                      <Typography variant="h6" fontWeight="bold">
                        Step {step.step}: {step.title}
                      </Typography>
                    </Box>
                    <Typography variant="body2" mb={2}>
                      {step.description}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                      Learning Objectives:
                    </Typography>
                    {(step.objectives || []).map((obj, idx) => (
                      <Typography key={idx} variant="body2">
                        • {obj}
                      </Typography>
                    ))}
                    <Typography variant="subtitle2" fontWeight="bold" mt={2} mb={1}>
                      Estimated Duration: {step.duration} minutes
                    </Typography>
                    {!currentSession.learningPath.completedSteps.includes(step.step) && (
                      <Button
                        variant="contained"
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={() => handleStepProgress(step.step)}
                      >
                        Mark as Completed
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: "center", py: 4 }}>
                <Typography color="gray">No learning path generated yet.</Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* ========== TAB 4: PROGRESS STATS ========== */}
      {tabValue === 4 && (
        <Grid container spacing={3}>
          {currentSession ? (
            <>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h5" fontWeight="bold" color="#1976d2">
                      {currentSession.progress?.questionsAnswered || 0}
                    </Typography>
                    <Typography variant="body2">Questions Answered</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h5" fontWeight="bold" color="green">
                      {currentSession.progress?.correctAnswers || 0}
                    </Typography>
                    <Typography variant="body2">Correct Answers</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h5" fontWeight="bold" color="#ff6f00">
                      {(currentSession.progress?.accuracy || 0).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2">Accuracy</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" mb={2}>
                      📈 Learning Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={currentSession.progress?.accuracy || 0}
                      sx={{ height: 15, borderRadius: 10, mb: 2 }}
                    />
                    <Typography variant="body2" color="gray">
                      Keep practicing to improve your accuracy!
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </>
          ) : (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 4 }}>
                  <Typography color="gray">Select a study session to view statistics.</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* ========== SUMMARY POPUP DIALOG ========== */}
      <Dialog open={summaryDialogOpen} onClose={() => setSummaryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight="bold">
          {summaryDialogData ? "📖 Session Summary" : "No Summary Available"}
        </DialogTitle>
        <DialogContent dividers>
          {summaryDialogData ? (
            <>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
                {summaryDialogData.aiGenerated}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold" mt={2}>
                Key Points:
              </Typography>
              <ul>
                {summaryDialogData.keyPoints?.map((point, idx) => (
                  <li key={idx}>
                    <Typography variant="body2">{point}</Typography>
                  </li>
                ))}
              </ul>
              <Typography variant="caption" color="textSecondary" display="block" mt={2}>
                Generated at: {new Date(summaryDialogData.generatedAt).toLocaleString()}
              </Typography>
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography variant="body1" gutterBottom>
                No summary has been generated for this session yet.
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                You can generate one now using the button below.
              </Typography>
              <Button
                variant="contained"
                onClick={() => {
                  setSummaryDialogOpen(false);
                  handleGenerateSummary();
                }}
                disabled={generating || !currentSession?.content?.rawText}
              >
                {generating ? "Generating..." : "Generate Summary"}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialogOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global dialog for summaries / answers */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight="bold">{dialogTitle}</DialogTitle>
        <DialogContent sx={{ whiteSpace: "pre-wrap", mt: 2 }}>
          <Typography>{dialogContent}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AIDashboard;