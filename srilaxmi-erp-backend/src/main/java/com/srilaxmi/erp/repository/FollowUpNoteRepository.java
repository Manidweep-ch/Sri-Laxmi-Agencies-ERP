package com.srilaxmi.erp.repository;

import com.srilaxmi.erp.entity.FollowUpNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FollowUpNoteRepository extends JpaRepository<FollowUpNote, Long> {
    List<FollowUpNote> findByFollowUpIdOrderByCreatedAtDesc(Long followUpId);
}
